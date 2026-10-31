(() => {
  'use strict';

  // ---------- Utilities ----------
  const $ = s => document.querySelector(s);
  const app = $('#app');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const pad = n => String(n).padStart(2, '0');
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const EPOCH = new Date(2026, 9, 26);
  const dayNum = key => { const [y, m, d] = key.split('-').map(Number); return Math.round((new Date(y, m - 1, d) - EPOCH) / 864e5) + 1; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function hash(s) { let h = 2166136261 >>> 0; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rngFrom(seed) {
    let a = hash(seed);
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function shuffle(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const pickRand = a => a[Math.floor(Math.random() * a.length)];
  const bst = sp => sp.stats.reduce((a, b) => a + b, 0);

  // ---------- Sprites ----------
  const SPR = dcExt('raw.githubusercontent.com', '/PokeAPI/sprites/master/sprites/pokemon/');
  const front = (id, shiny) => `${SPR}${shiny ? 'shiny/' : ''}${id}.png`;
  const back = (id, shiny) => `${SPR}back/${shiny ? 'shiny/' : ''}${id}.png`;
  // Alternate forms have their own sprite number (PokeAPI numbers them from 10001)
  const sprOf = sp => sp.spr || sp.id;
  const trainerSrc = boss => dcExt('play.pokemonshowdown.com', `/sprites/trainers/${boss.sprite || boss.key}.png`);
  // Trainers without a Showdown sprite get a Poké Ball silhouette instead of an empty gap
  const TRAINER_FALLBACK = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#000" fill-opacity=".35" stroke="#fff" stroke-opacity=".5" stroke-width="3"/><path d="M6 32h52" stroke="#fff" stroke-opacity=".5" stroke-width="3"/><circle cx="32" cy="32" r="7" fill="#000" fill-opacity=".5" stroke="#fff" stroke-opacity=".5" stroke-width="3"/></svg>');
  window.dcTrainerFallback = img => { img.onerror = null; img.src = TRAINER_FALLBACK; img.style.imageRendering = 'auto'; };
  // Newer Pokémon have no back sprite: fall back to a mirrored front sprite.
  window.dcBackFallback = img => { img.onerror = null; img.src = front(img.dataset.id, img.dataset.shiny === '1'); img.classList.add('flip'); };
  const typeBadge = t => `<span class="type" style="background:${TYPE_COLORS[t]}">${t}</span>`;

  // ---------- Persistence ----------
  const LS = 'dailyChampion.v1';
  let save;
  try { save = JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { save = {}; }
  save.days = save.days || {};
  save.settings = save.settings || { speed: 1 };
  save.shinies = save.shinies || {};  // Shiny Dex: name -> { date, num, boss, diff }
  function persist() { try { localStorage.setItem(LS, JSON.stringify(save)); } catch (e) { /* storage unavailable */ } }

  // ---------- Daily selection ----------
  const TODAY = dateKey(new Date());
  function bossFor(key) {
    const n = dayNum(key) - 1, L = BOSSES.length;
    const cycle = Math.floor(n / L), idx = ((n % L) + L) % L;
    return shuffle(BOSSES, rngFrom('cycle' + cycle))[idx];
  }
  // ---------- Draft pool: built around the boss, deterministic per seed ----------
  const POWER_ABILS = ['Huge Power', 'Pure Power'];
  // Runs fn with no battle state, so ability/weather checks don't read the current battle
  function withoutBattle(fn) { const saved = G; G = null; try { return fn(); } finally { G = saved; } }

  const duelCache = {};
  const turnsToKO = (a, d) => {
    const dmg = bestMove(a, d).dmg;
    if (!(dmg > 0)) return 99;
    const n = Math.ceil(d.maxhp / dmg);
    return abil(a) === 'Truant' ? 2 * n - 1 : n;  // Truant only acts every other turn
  };
  // Rough 1-v-1 between fresh Lv. 100 Pokémon with Hard movesets: 1 = x wins, 0.5 = even, 0 = y wins
  function duel(xn, yn) {
    const key = xn + '|' + yn;
    if (key in duelCache) return duelCache[key];
    const x = makeMon(xn, 100, 'hard'), y = makeMon(yn, 100, 'hard');
    const tx = turnsToKO(x, y), ty = turnsToKO(y, x);
    let r = tx < ty ? 1 : tx > ty ? 0 : null;
    if (r === null) { const sx = speed(x), sy = speed(y); r = tx === 99 || sx === sy ? 0.5 : sx > sy ? 1 : 0; }
    return (duelCache[key] = r);
  }

  // Fair = every boss Pokémon has real answers, the ace has outright counters, nothing sweeps the pool,
  // and it isn't a walkover. penalty 0 means all rules pass.
  function judgePool(pool, team) {
    const beaten = team.map(y => pool.reduce((sum, x) => sum + duel(x, y), 0));
    const outright = team.map(y => pool.filter(x => duel(x, y) === 1).length);
    const sweeps = team.map(y => pool.filter(x => duel(x, y) === 0).length);
    const share = beaten.reduce((a, b) => a + b, 0) / (pool.length * team.length);
    let penalty = 0;
    for (const b of beaten) if (b < 2) penalty += 2 - b;
    if (outright[team.length - 1] < 2) penalty += 2 - outright[team.length - 1];
    if (Math.min(...beaten) > 4) penalty += Math.min(...beaten) - 4;
    if (share > 0.7) penalty += (share - 0.7) * 10;
    for (const n of sweeps) if (n >= 7) penalty += n - 6;
    return { ok: penalty === 0, penalty, beaten, outright, share };
  }

  // 9 Pokémon, different primary types where possible, at most 2 sub-legendaries and 1 legendary
  function drawPool(eligible, r) {
    const cands = shuffle(eligible, r), out = [], used = new Set(), species = new Set();
    let subs = 0, legs = 0;
    const allowed = s => s.tier === 'L' ? legs < 1 : s.tier === 'S' ? subs < 2 : true;
    const add = s => { out.push(s.name); used.add(s.types[0]); species.add(s.id); if (s.tier === 'L') legs++; if (s.tier === 'S') subs++; };
    for (const s of cands) { if (out.length >= 9) break; if (!used.has(s.types[0]) && !species.has(s.id) && allowed(s)) add(s); }
    for (const s of cands) { if (out.length >= 9) break; if (!species.has(s.id) && allowed(s)) add(s); }
    return out;
  }

  function poolFor(seed, boss) {
    return withoutBattle(() => {
      const team = boss.team;
      // A legendary may only appear when the boss brings a legendary or sub-legendary of its own
      const legBoss = team.some(n => DEX[n].tier);
      const eligible = Object.values(DEX).filter(s =>
        (bst(s) >= 470 || (POWER_ABILS.includes(ABILITIES[s.name]) && bst(s) >= 380)) && (!s.leg || legBoss) && s.moves.some(m => MOVES[m].cat !== 'x'));
      let best = null;
      for (let k = 0; k < 300; k++) {
        const pool = drawPool(eligible, rngFrom(seed + ':' + k));
        const res = judgePool(pool, team);
        if (res.ok) return pool;
        if (!best || res.penalty < best.penalty) best = { pool, penalty: res.penalty };
      }
      return best.pool;
    });
  }
  const bossOf = g => BOSSES.find(b => b.key === g.bossKey);

  const DIFFS = {
    normal: { label: 'Normal', lvl: 100, desc: 'Lv. 100. Usually picks strong moves, sometimes slips up. Sets include setup moves.' },
    hard: { label: 'Hard', lvl: 100, desc: 'Lv. 100 with competitively trained stats. Thinks a turn ahead, switches to win matchups, revenge-kills, plays around speed and KOs. No setup moves, no hints.' }
  };
  const diffLabel = k => (DIFFS[k] || { label: k ? k[0].toUpperCase() + k.slice(1) : '?' }).label;
  // On Hard, stat-boosting setup moves are replaced (see HARD_MOVES in data.js)
  const isSetup = n => !!(MOVES[n] && MOVES[n].setup);
  const movesFor = (name, diff) => DEX[name].moves.map(n => diff === 'hard' && isSetup(n) && HARD_MOVES[name] ? HARD_MOVES[name] : n);

  // G = current run (the daily one lives inside save.days so it persists)
  let G = null;
  let busy = false;

  // ---------- Shiny hunting ----------
  // Each of the 9 draft cards has a 1/SHINY_ODDS chance; on a hit the player gets a bonus shiny card
  // that can be ANY species. Rolled per player (not seeded) and saved with the day. Daily runs only.
  const SHINY_ODDS = 100;
  function rollShiny(pool) {
    if (!pool.some(() => Math.random() < 1 / SHINY_ODDS)) return null;
    const names = Object.keys(DEX).filter(n => !pool.includes(n));
    let pick = pickRand(names);
    for (let i = 0; i < 3 && save.shinies[pick]; i++) pick = pickRand(names);  // favour new ones
    return pick;
  }
  const isShiny = name => !!(G && G.shiny && G.shiny === name);

  function newDaily() {
    const boss = bossFor(TODAY);
    const run = { mode: 'daily', key: TODAY, num: dayNum(TODAY), bossKey: boss.key, diff: 'normal', pool: poolFor(TODAY + ':pool', boss), picks: [], phase: 'intro' };
    run.shiny = rollShiny(run.pool); run.shinyRolled = true;
    return run;
  }
  function newPractice(sameBoss, bossKey) {
    const boss = bossKey ? BOSSES.find(b => b.key === bossKey) : sameBoss ? bossFor(TODAY) : pickRand(BOSSES);
    return { mode: 'practice', key: 'practice', num: 0, bossKey: boss.key, diff: G ? G.diff : 'normal', pool: poolFor('p' + Math.random(), boss), picks: [], phase: 'intro' };
  }
  function persistRun() { if (G && G.mode === 'daily') { save.days[G.key] = G; persist(); } }

  // ---------- Pokémon instances ----------
  // PP with PP Ups (×8/5), as in competitive play
  const maxPP = n => { const m = MOVES[n]; return !m || !m.pp ? 1 : m.pp === 1 ? 1 : Math.floor(m.pp * 8 / 5); };
  const freshBoosts = () => ({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 });
  // Competitive training for Hard bosses: EVs (out of 252 per stat) and nature multipliers,
  // in stat order [hp, atk, def, spa, spd, spe]
  function trainedSpread(b, moves) {
    const cats = moves.map(n => MOVES[n] && MOVES[n].cat);
    const phys = cats.filter(c => c === 'p').length, spec = cats.filter(c => c === 's').length;
    const atk = phys > spec || (phys === spec && b[1] >= b[3]) ? 1 : 3, other = atk === 1 ? 3 : 1;
    const slowOnPurpose = moves.some(n => n === 'Trick Room' || n === 'Gyro Ball');
    const bulky = slowOnPurpose || b[5] < 60 || b[0] + b[2] + b[4] > 1.4 * (b[1] + b[3] + b[5]);
    const ev = [0, 0, 0, 0, 0, 0], nat = [1, 1, 1, 1, 1, 1];
    if (bulky) { ev[0] = 252; ev[atk] = 252; ev[2] = 4; } else { ev[atk] = 252; ev[5] = 252; ev[0] = 4; }
    nat[atk] = 1.1;
    nat[slowOnPurpose ? 5 : phys && spec ? (bulky ? 5 : 4) : other] = 0.9;
    return { ev, nat };
  }
  function makeMon(name, level, diff, trained) {
    const sp = DEX[name], b = sp.stats;
    const moves = movesFor(name, diff);
    const { ev, nat } = trained ? trainedSpread(b, moves) : { ev: [85, 85, 85, 85, 85, 85], nat: [1, 1, 1, 1, 1, 1] };
    const calc = (v, i) => {
      const core = Math.floor((2 * v + 31 + Math.floor(ev[i] / 4)) * level / 100);
      return i === 0 ? core + level + 10 : Math.floor((core + 5) * nat[i]);
    };
    const s = b.map(calc);
    if (name === 'Pikachu') { s[1] *= 2; s[3] *= 2; } // Light Ball
    if (name === 'Shedinja') s[0] = 1;
    return {
      name, id: sp.id, spr: sprOf(sp), types: sp.types.slice(), level, maxhp: s[0], hp: s[0],
      st: { atk: s[1], def: s[2], spa: s[3], spd: s[4], spe: s[5] },
      boosts: freshBoosts(), status: null, slp: 0, tox: 0, moves, trained: !!trained,
      pp: Object.fromEntries(moves.map(n => [n, maxPP(n)])), v: {}
    };
  }
  // Battles saved by older versions: fill in fields added since
  function ensureMon(m) {
    m.v = m.v || {};
    if (m.boosts.acc === undefined) { m.boosts.acc = 0; m.boosts.eva = 0; }
    if (!m.pp) m.pp = Object.fromEntries(m.moves.map(n => [n, maxPP(n)]));
    m.moves = m.moves.filter(n => MOVES[n]);
  }
  function ensureBattle(B) {
    B.side = B.side || { p: {}, b: {} };
    B.field = B.field || {};
    B.future = B.future || {};
    B.p.forEach(ensureMon); B.b.forEach(ensureMon);
  }

  // ---------- Battle math ----------
  const MULT = s => s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
  const ACC_MULT = s => s >= 0 ? (3 + s) / 3 : 3 / (3 - s);
  const pokeRound = x => (x % 1 > 0.5 ? Math.ceil(x) : Math.floor(x));

  // ---------- Abilities & weather ----------
  // m.abil overrides the species ability (Trace, Mummy, Imposter...); Neutralizing Gas suppresses everything else
  const baseAbil = m => m.abil || ABILITIES[m.name] || null;
  function abil(m) {
    const a = baseAbil(m);
    if (a && a !== 'Neutralizing Gas' && G && G.battle && G.battle.p) {
      const B = G.battle, p = B.p[B.pa], b = B.b[B.ba];
      if ((p && p.hp > 0 && baseAbil(p) === 'Neutralizing Gas') || (b && b.hp > 0 && baseAbil(b) === 'Neutralizing Gas')) return null;
    }
    return a;
  }
  // Mold Breaker (and its clones) make the attacker ignore the defender's ability
  const MOLD = ['Mold Breaker', 'Turboblaze', 'Teravolt'];
  const defAbil = (a, d) => MOLD.includes(abil(a)) ? null : abil(d);
  const activeHas = name => G && G.battle && G.battle.p && ['p', 'b'].some(s => { const m = act(s); return m && m.hp > 0 && abil(m) === name; });
  // Cloud Nine / Air Lock cancel the weather's effects while on the field
  const weather = () => (G && G.battle && G.battle.weather && !activeHas('Cloud Nine') && !activeHas('Air Lock')) ? G.battle.weather.type : null;
  const terrain = () => (G && G.battle && G.battle.terrain) ? G.battle.terrain.type : null;
  // Grounded: not Flying (Roost removes the type for a turn) and no Levitate, unless Smack Down / Ingrain pin it
  const grounded = m => (m.v && (m.v.smackdown || m.v.ingrain)) || (!m.types.includes('Flying') && abil(m) !== 'Levitate');
  const TERRAIN_SETTERS = { 'Electric Surge': 'electric', 'Grassy Surge': 'grassy', 'Psychic Surge': 'psychic', 'Misty Surge': 'misty', 'Hadron Engine': 'electric' };
  const TERRAIN_TEXT = {
    electric: ['An electric current ran across the battlefield!', 'The electricity disappeared from the battlefield.', '⚡ Electric Terrain'],
    grassy: ['Grass grew to cover the battlefield!', 'The grass disappeared from the battlefield.', '🌿 Grassy Terrain'],
    psychic: ['The battlefield got weird!', 'The weirdness disappeared from the battlefield.', '🔮 Psychic Terrain'],
    misty: ['Mist swirled around the battlefield!', 'The mist disappeared from the battlefield.', '🌫 Misty Terrain']
  };
  const TERRAIN_BOOST = { electric: 'Electric', grassy: 'Grass', psychic: 'Psychic' };
  // Protosynthesis / Quark Drive boost the highest stat in sun / Electric Terrain
  const boosted = m => (abil(m) === 'Protosynthesis' && weather() === 'sun') || (abil(m) === 'Quark Drive' && terrain() === 'electric');
  // Form changes: base stats of the alternate form
  const FORMS = {
    blade: [60, 140, 50, 140, 50, 60], shield: [60, 50, 140, 50, 140, 60],
    Schooling: [45, 140, 130, 140, 135, 30], 'Shields Down': [60, 100, 60, 100, 60, 120],
    'Zen Mode': [105, 30, 105, 140, 105, 55], 'Zen Mode Galar': [105, 160, 55, 30, 55, 135], 'Power Construct': [216, 100, 121, 91, 95, 85],
    'Zero to Hero': [100, 160, 97, 106, 87, 100]
  };
  const FORM_ABILS = ['Stance Change', 'Schooling', 'Shields Down', 'Zen Mode', 'Power Construct', 'Zero to Hero', 'Forecast'];
  const NO_COPY = ['Trace', 'Imposter', 'Neutralizing Gas', 'Disguise', 'Ice Face', 'Battle Bond', 'Comatose', 'Wonder Guard', ...FORM_ABILS];
  const WEATHER_SETTERS = { Drizzle: 'rain', Drought: 'sun', 'Sand Stream': 'sand', 'Snow Warning': 'snow' };
  const WEATHER_TEXT = {
    rain: ['It started to rain!', 'The rain stopped.', '🌧 Rain'],
    sun: ['The sunlight turned harsh!', 'The harsh sunlight faded.', '☀️ Harsh sun'],
    sand: ['A sandstorm kicked up!', 'The sandstorm subsided.', '🌪 Sandstorm'],
    snow: ['It started to snow!', 'The snow stopped.', '❄️ Snow']
  };
  const WEATHER_SPEED = { 'Swift Swim': 'rain', Chlorophyll: 'sun', 'Sand Rush': 'sand', 'Slush Rush': 'snow' };
  const SAND_IMMUNE = ['Magic Guard', 'Sand Rush', 'Sand Force', 'Overcoat'];
  // ability -> [type it absorbs, effect]: 'heal' | 'ff' | stat boosts | null (plain immunity)
  const ABSORB = {
    'Water Absorb': ['Water', 'heal'], 'Dry Skin': ['Water', 'heal'], 'Volt Absorb': ['Electric', 'heal'],
    'Earth Eater': ['Ground', 'heal'], 'Lightning Rod': ['Electric', { spa: 1 }], 'Motor Drive': ['Electric', { spe: 1 }],
    'Storm Drain': ['Water', { spa: 1 }], 'Sap Sipper': ['Grass', { atk: 1 }], 'Flash Fire': ['Fire', 'ff'], Levitate: ['Ground', null],
    'Well-Baked Body': ['Fire', { def: 2 }]
  };
  const PINCH = { Blaze: 'Fire', Torrent: 'Water', Overgrow: 'Grass', Swarm: 'Bug' };
  // Forms whose held item is built in: the Origin orbs boost two types, Ogerpon's masks boost everything
  const ITEM_BOOST = { 'Dialga-Origin': ['Steel', 'Dragon'], 'Palkia-Origin': ['Water', 'Dragon'], 'Giratina-Origin': ['Ghost', 'Dragon'],
    'Ogerpon-Wellspring': 'all', 'Ogerpon-Hearthflame': 'all', 'Ogerpon-Cornerstone': 'all' };
  const OGERPON_TYPE = { 'Ogerpon-Wellspring': 'Water', 'Ogerpon-Hearthflame': 'Fire', 'Ogerpon-Cornerstone': 'Rock' };
  const BULL_TYPE = { 'Tauros-Paldea-Combat': 'Fighting', 'Tauros-Paldea-Blaze': 'Fire', 'Tauros-Paldea-Aqua': 'Water' };
  const ATE = { Pixilate: 'Fairy', Refrigerate: 'Ice', Aerilate: 'Flying', Galvanize: 'Electric' };
  const TYPE_BOOST = { 'Steely Spirit': ['Steel', 1.5], Steelworker: ['Steel', 1.5], 'Rocky Payload': ['Rock', 1.5], "Dragon's Maw": ['Dragon', 1.5], Transistor: ['Electric', 1.3], 'Water Bubble': ['Water', 2] };
  const NO_DROPS = ['Clear Body', 'Mirror Armor', 'Full Metal Body', 'White Smoke'];
  const NO_INTIMIDATE = ['Inner Focus', 'Oblivious', 'Scrappy', 'Own Tempo'];
  const TRAPPERS = { 'Shadow Tag': m => true, 'Arena Trap': m => grounded(m), 'Magnet Pull': m => m.types.includes('Steel') };
  const STATUS_GUARD = {
    Insomnia: ['slp'], 'Vital Spirit': ['slp'], 'Sweet Veil': ['slp'], Limber: ['par'], Immunity: ['psn', 'tox'],
    'Magma Armor': ['frz'], 'Water Veil': ['brn'], 'Thermal Exchange': ['brn'], 'Water Bubble': ['brn'], 'Pastel Veil': ['psn', 'tox']
  };
  const HALF_TRIGGERS = ['Berserk', 'Anger Shell', 'Wimp Out', 'Emergency Exit'];
  const PRIO_BLOCK = ['Queenly Majesty', 'Armor Tail', 'Dazzling'];
  const KO_BOOST = { Moxie: { atk: 1 }, 'Chilling Neigh': { atk: 1 }, 'Grim Neigh': { spa: 1 }, 'As One (Glastrier)': { atk: 1 }, 'As One (Spectrier)': { spa: 1 } };
  const VOL_BLOCKERS = { taunt: ['Oblivious', 'Aroma Veil'], encore: ['Aroma Veil'], disable: ['Aroma Veil'] };

  function moveType(a, m) {
    const ab = abil(a);
    if (ab === 'Normalize') return 'Normal';
    if (m.special === 'weatherball') { const W = weather(); return W === 'rain' ? 'Water' : W === 'sun' ? 'Fire' : W === 'sand' ? 'Rock' : W === 'snow' ? 'Ice' : 'Normal'; }
    if (m.special === 'terrainpulse' && grounded(a)) { const T = terrain(); return T ? { electric: 'Electric', grassy: 'Grass', psychic: 'Psychic', misty: 'Fairy' }[T] : 'Normal'; }
    if (m.special === 'ivycudgel') return OGERPON_TYPE[a.name] || 'Grass';
    if (m.special === 'ragingbull') return BULL_TYPE[a.name] || 'Normal';
    if (ab === 'Liquid Voice' && m.sound) return 'Water';
    return m.type === 'Normal' && ATE[ab] ? ATE[ab] : m.type;
  }
  function absorbedBy(a, d, type) {
    const x = defAbil(a, d);
    if (x === 'Levitate' && type === 'Ground' && d.v && (d.v.smackdown || d.v.ingrain)) return null;
    return x && ABSORB[x] && ABSORB[x][0] === type ? x : null;
  }
  // Abilities that block a damaging move outright (not by type absorption)
  function blockedBy(a, d, m) {
    const x = defAbil(a, d);
    if (x === 'Bulletproof' && m.bullet) return x;
    if (x === 'Soundproof' && m.sound) return x;
    if (x === 'Wonder Guard' && m.cat !== 'x' && !m.fixed && eff(a, m, d) <= 1) return x;
    if (x === 'Wind Rider' && m.wind) return x;
    if (x === 'Damp' && (m.selfKO === 'always' || m.special === 'mistyexplosion')) return x;
    return null;
  }
  const typeEff = (type, d) => d.types.reduce((e, t) => { const x = (CHART[type] || {})[t]; return e * (x === undefined ? 1 : x); }, 1);
  function eff(a, m, d) {
    const type = moveType(a, m);
    let e = 1;
    for (const t of d.types) {
      let x = (CHART[type] || {})[t]; if (x === undefined) x = 1;
      if (m.special === 'freezedry' && t === 'Water') x = 2;
      if (x === 0 && t === 'Ghost' && (abil(a) === 'Scrappy' || abil(a) === "Mind's Eye") && (type === 'Normal' || type === 'Fighting')) x = 1;
      if (x === 0 && t === 'Flying' && type === 'Ground' && d.v && (d.v.smackdown || d.v.ingrain)) x = 1;
      e *= x;
    }
    return e;
  }
  function stat(mon, k, crit, isDef, ignoreBoosts) {
    let s = ignoreBoosts ? 0 : mon.boosts[k];
    if (crit) s = isDef ? Math.min(s, 0) : Math.max(s, 0);
    return mon.st[k] * MULT(s);
  }
  const sideKey = mon => (G && G.battle && G.battle.b.includes(mon)) ? 'b' : 'p';
  const sideOf = mon => (G && G.battle && G.battle.side) ? G.battle.side[sideKey(mon)] : null;
  function speed(m) {
    const a = abil(m);
    let s = m.st.spe * MULT(m.boosts.spe);
    if (a === 'Quick Feet' && m.status) s *= 1.5; else if (m.status === 'par') s *= 0.5;
    if (WEATHER_SPEED[a] && WEATHER_SPEED[a] === weather()) s *= 2;
    if (a === 'Surge Surfer' && terrain() === 'electric') s *= 2;
    if (boosted(m) && topStat(m) === 'spe') s *= 1.5;
    if (a === 'Slow Start' && m.slow > 0) s *= 0.5;
    const sd = sideOf(m); if (sd && sd.tailwind) s *= 2;
    return Math.floor(s);
  }
  function prio(mon, name) {
    const m = MOVES[name], a = abil(mon);
    let p = m.prio || 0;
    if (a === 'Prankster' && m.cat === 'x') p++;
    if (a === 'Gale Wings' && m.type === 'Flying' && mon.hp === mon.maxhp) p++;
    if (a === 'Triage' && (m.heal || m.drain || ['synthesis', 'morningsun', 'moonlight', 'shoreup', 'roost', 'strengthsap', 'wish'].includes(m.special))) p += 3;
    if (m.special === 'grassyglide' && terrain() === 'grassy' && grounded(mon)) p++;
    return p;
  }
  // Stall and Mycelium Might (for status moves) act last within their priority bracket
  const movesLast = (mon, name) => abil(mon) === 'Stall' || (abil(mon) === 'Mycelium Might' && MOVES[name].cat === 'x');
  const topStat = m => ['atk', 'def', 'spa', 'spd', 'spe'].reduce((x, y) => m.st[y] > m.st[x] ? y : x);
  function faintedAllies(mon, uncapped) {
    const B = G && G.battle; if (!B) return 0;
    const team = B.p.includes(mon) ? B.p : B.b, n = team.filter(x => x.hp <= 0).length;
    return uncapped ? n : Math.min(5, n);
  }
  const wt = m => (DEX[m.name] && DEX[m.name].wt) || 50;
  const weightPower = kg => kg < 10 ? 20 : kg < 25 ? 40 : kg < 50 ? 60 : kg < 100 ? 80 : kg < 200 ? 100 : 120;

  // Base power after move-specific rules (ctx: hit number, turn order, Pursuit...)
  function movePower(a, d, m, ctx = {}) {
    const W = weather(), T = terrain();
    switch (m.special) {
      case 'return': case 'frustration': return 102;
      case 'acrobatics': return 110;                                  // no held items, so always doubled
      case 'knockoff': return m.power;                                // no held items, so never boosted
      case 'seismictoss': case 'nightshade': return 0;                // fixed damage (equal to level), see fixedDamage
      case 'grassknot': case 'lowkick': return weightPower(wt(d));
      case 'heavyslam': case 'heatcrash': { const r = wt(a) / wt(d); return r >= 5 ? 120 : r >= 4 ? 100 : r >= 3 ? 80 : r >= 2 ? 60 : 40; }
      case 'gyroball': return Math.min(150, Math.floor(25 * speed(d) / Math.max(1, speed(a))) + 1);
      case 'electroball': { const r = speed(a) / Math.max(1, speed(d)); return r >= 4 ? 150 : r >= 3 ? 120 : r >= 2 ? 80 : r >= 1 ? 60 : 40; }
      case 'eruption': case 'waterspout': case 'dragonenergy': return Math.max(1, Math.floor(150 * a.hp / a.maxhp));
      case 'flail': case 'reversal': { const p = Math.floor(48 * a.hp / a.maxhp); return p <= 1 ? 200 : p <= 4 ? 150 : p <= 9 ? 100 : p <= 16 ? 80 : p <= 32 ? 40 : 20; }
      case 'hex': return d.status || abil(d) === 'Comatose' ? 130 : 65;
      case 'venoshock': return d.status === 'psn' || d.status === 'tox' ? 130 : 65;
      case 'brine': return d.hp * 2 <= d.maxhp ? 130 : 65;
      case 'storedpower': case 'powertrip': return 20 + 20 * Object.values(a.boosts).reduce((s, v) => s + Math.max(0, v), 0);
      case 'avalanche': case 'revenge': return a.v.hitBy ? 120 : 60;
      case 'payback': return ctx.movedLast ? 100 : 50;
      case 'boltbeak': case 'fishiousrend': return ctx.movedFirst ? 170 : 85;
      case 'assurance': return d.v.hitBy ? 120 : 60;
      case 'ragefist': return Math.min(350, 50 + 50 * (a.timesHit || 0));
      case 'lastrespects': return 50 + 50 * faintedAllies(a, true);
      case 'temperflare': case 'stompingtantrum': return a.v.lastFailed ? m.power * 2 : m.power;
      case 'facade': return a.status ? 140 : 70;
      case 'smellingsalts': return d.status === 'par' ? 140 : 70;
      case 'wakeupslap': return d.status === 'slp' ? 140 : 70;
      case 'crushgrip': case 'wringout': return Math.max(1, Math.floor(120 * d.hp / d.maxhp));
      case 'hardpress': return Math.max(1, Math.floor(100 * d.hp / d.maxhp));
      case 'weatherball': return W ? 100 : 50;
      case 'terrainpulse': return T && grounded(a) ? 100 : 50;
      case 'risingvoltage': return T === 'electric' && grounded(d) ? 140 : 70;
      case 'expandingforce': return T === 'psychic' && grounded(a) ? 120 : 80;
      case 'psyblade': return T === 'electric' ? 120 : 80;
      case 'mistyexplosion': return T === 'misty' && grounded(a) ? 150 : 100;
      case 'solarbeam': case 'solarblade': return W && W !== 'sun' ? Math.floor(m.power / 2) : m.power;
      case 'pursuit': return ctx.pursuit ? 80 : 40;
      case 'triplekick': return 10 * (ctx.hit || 1);
      case 'tripleaxel': return 20 * (ctx.hit || 1);
      case 'ficklebeam': return ctx.fickle ? 160 : 80;
    }
    return m.power;
  }
  function powerMod(a, m, bp, d) {
    const ab = abil(a), type = moveType(a, m), T = terrain();
    let f = 1;
    if ((ATE[ab] && m.type === 'Normal') || ab === 'Normalize') f *= 1.2;
    if (ab === 'Technician' && bp <= 60) f *= 1.5;
    if (ab === 'Iron Fist' && m.punch) f *= 1.2;
    if (ab === 'Strong Jaw' && m.bite) f *= 1.5;
    if (ab === 'Mega Launcher' && m.pulse) f *= 1.5;
    if (ab === 'Sharpness' && m.slicing) f *= 1.5;
    if (ab === 'Punk Rock' && m.sound) f *= 1.3;
    if (TYPE_BOOST[ab] && type === TYPE_BOOST[ab][0]) f *= TYPE_BOOST[ab][1];
    if (ab === 'Tough Claws' && m.contact) f *= 1.3;
    if (ab === 'Sand Force' && weather() === 'sand' && ['Rock', 'Ground', 'Steel'].includes(type)) f *= 1.3;
    if (ab === 'Reckless' && (m.recoil || m.crash)) f *= 1.2;
    if (ab === 'Sheer Force' && (m.secs || m.tgt)) f *= 1.3;
    if (ab === 'Supreme Overlord') f *= 1 + 0.1 * faintedAllies(a);
    if (ab === 'Analytic' && G && G.battle && G.battle.acted && G.battle.acted[sideKey(a) === 'p' ? 'b' : 'p']) f *= 1.3;
    if (T && TERRAIN_BOOST[T] === type && grounded(a)) f *= 1.3;
    if (T === 'misty' && type === 'Dragon' && grounded(d)) f *= 0.5;
    if (T === 'grassy' && ['Earthquake', 'Bulldoze'].includes(m.name) && grounded(d)) f *= 0.5;
    if ((type === 'Fairy' && activeHas('Fairy Aura')) || (type === 'Dark' && activeHas('Dark Aura'))) f *= activeHas('Aura Break') ? 0.75 : 4 / 3;
    if (a.charged && type === 'Electric') f *= 2;
    const item = ITEM_BOOST[a.name];
    if (item && (item === 'all' || item.includes(type))) f *= 1.2;
    if (defAbil(a, d) === 'Dry Skin' && type === 'Fire') f *= 1.25;
    return f;
  }
  const FIXED = ['superfang', 'naturesmadness', 'ruination', 'endeavor', 'finalgambit', 'counter', 'mirrorcoat', 'metalburst', 'comeuppance'];
  function fixedDamage(a, d, m) {
    if (m.fixed === 'level') return a.level;
    if (typeof m.fixed === 'number') return m.fixed;
    const h = a.v.hitBy;
    switch (m.special) {
      case 'superfang': case 'naturesmadness': case 'ruination': return Math.max(1, Math.floor(d.hp / 2));
      case 'endeavor': return Math.max(0, d.hp - a.hp);
      case 'finalgambit': return a.hp;
      case 'counter': return h && h.cat === 'p' ? h.dmg * 2 : 0;
      case 'mirrorcoat': return h && h.cat === 's' ? h.dmg * 2 : 0;
      case 'metalburst': case 'comeuppance': return h ? Math.floor(h.dmg * 1.5) : 0;
    }
    return 0;
  }
  // Damage of one hit (Gen 9 formula: 4096-style rounding, 16 random rolls; roll is 0.85–1.00)
  function calc(a, d, m, roll, crit, ctx = {}) {
    if (m.cat === 'x') return 0;
    const type = moveType(a, m);
    if (absorbedBy(a, d, type) || blockedBy(a, d, m)) return 0;
    const e = eff(a, m, d); if (!e) return 0;
    if (m.fixed || FIXED.includes(m.special)) return fixedDamage(a, d, m);
    if (m.ohko) return d.hp;
    const aA = abil(a), dA = defAbil(a, d), W = weather(), T = terrain();
    const phys = m.cat === 'p', useDef = phys || m.psyshock;
    const src = m.special === 'foulplay' ? d : a;
    const atkKey = m.special === 'bodypress' ? 'def' : phys ? 'atk' : 'spa';
    let A = stat(src, atkKey, crit, false, dA === 'Unaware');
    let D = stat(d, useDef ? 'def' : 'spd', crit, true, aA === 'Unaware' || m.ignoreDef);
    if (phys && (aA === 'Huge Power' || aA === 'Pure Power')) A *= 2;
    if (phys && aA === 'Guts' && a.status) A *= 1.5;
    if (phys && aA === 'Hustle') A *= 1.5;
    if (!phys && aA === 'Solar Power' && W === 'sun') A *= 1.5;
    if (boosted(a) && topStat(a) === (phys ? 'atk' : 'spa')) A *= 1.3;
    if (dA && boosted(d) && topStat(d) === (useDef ? 'def' : 'spd')) D *= 1.3;
    if (!phys && aA === 'Flare Boost' && a.status === 'brn') A *= 1.5;
    if (phys && aA === 'Toxic Boost' && (a.status === 'psn' || a.status === 'tox')) A *= 1.5;
    if (aA === 'Defeatist' && a.hp <= a.maxhp / 2) A *= 0.5;
    if (phys && aA === 'Slow Start' && a.slow > 0) A *= 0.5;
    if (phys && aA === 'Flower Gift' && W === 'sun') A *= 1.5;
    if (phys && aA === 'Orichalcum Pulse' && W === 'sun') A *= 4 / 3;
    if (!phys && aA === 'Hadron Engine' && T === 'electric') A *= 4 / 3;
    if (a.ff && type === 'Fire') A *= 1.5;
    if (PINCH[aA] === type && a.hp <= a.maxhp / 3) A *= 1.5;
    if (aA === 'Stakeout' && G && G.battle && d.entered === G.battle.turn) A *= 2;
    if (dA === 'Thick Fat' && (type === 'Fire' || type === 'Ice')) A *= 0.5;
    if (dA === 'Heatproof' && type === 'Fire') A *= 0.5;
    if (dA === 'Water Bubble' && type === 'Fire') A *= 0.5;
    if (dA === 'Purifying Salt' && type === 'Ghost') A *= 0.5;
    if (phys && abil(d) === 'Tablets of Ruin') A *= 0.75;
    if (!phys && abil(d) === 'Vessel of Ruin') A *= 0.75;
    if (useDef && aA === 'Sword of Ruin') D *= 0.75;
    if (!useDef && aA === 'Beads of Ruin') D *= 0.75;
    if (!useDef && dA === 'Flower Gift' && W === 'sun') D *= 1.5;
    if (useDef && dA === 'Grass Pelt' && T === 'grassy') D *= 1.5;
    if (useDef && dA === 'Fur Coat') D *= 2;
    if (useDef && dA === 'Marvel Scale' && d.status) D *= 1.5;
    if (!useDef && W === 'sand' && d.types.includes('Rock')) D *= 1.5;
    if (useDef && W === 'snow' && d.types.includes('Ice')) D *= 1.5;
    A = Math.max(1, Math.floor(A)); D = Math.max(1, Math.floor(D));
    let bp = movePower(a, d, m, ctx);
    bp = Math.max(1, pokeRound(bp * powerMod(a, m, bp, d)));
    let dmg = Math.floor(Math.floor(Math.floor(2 * a.level / 5 + 2) * bp * A / D) / 50) + 2;
    if (W === 'rain') { if (type === 'Water') dmg = pokeRound(dmg * 1.5); else if (type === 'Fire') dmg = pokeRound(dmg * 0.5); }
    if (W === 'sun') { if (type === 'Fire' || m.special === 'hydrosteam') dmg = pokeRound(dmg * 1.5); else if (type === 'Water') dmg = pokeRound(dmg * 0.5); }
    if (crit) dmg = Math.floor(dmg * 1.5);
    dmg = Math.floor(dmg * Math.round(roll * 100) / 100);
    if (a.types.includes(type)) dmg = pokeRound(dmg * (aA === 'Adaptability' ? 2 : 1.5));
    dmg = Math.floor(dmg * e);
    if (phys && a.status === 'brn' && aA !== 'Guts' && m.special !== 'facade') dmg = Math.floor(dmg * 0.5);
    let f = 1;
    const sd = sideOf(d);
    if (sd && !crit && aA !== 'Infiltrator' && ((phys && (sd.reflect || sd.auroraveil)) || (!phys && (sd.lightscreen || sd.auroraveil)))) f *= 0.5;
    if ((dA === 'Multiscale' || abil(d) === 'Shadow Shield') && d.hp === d.maxhp) f *= 0.5;
    if ((dA === 'Filter' || dA === 'Solid Rock' || dA === 'Prism Armor') && e > 1) f *= 0.75;
    if (dA === 'Fluffy' && m.contact && aA !== 'Long Reach') f *= 0.5;
    if (dA === 'Fluffy' && type === 'Fire') f *= 2;
    if (dA === 'Ice Scales' && !phys) f *= 0.5;
    if (aA === 'Tinted Lens' && e < 1) f *= 2;
    if (aA === 'Sniper' && crit) f *= 1.5;
    if ((m.special === 'collisioncourse' || m.special === 'electrodrift') && e > 1) f *= 5461 / 4096;
    if (d.v && d.v.glaive) f *= 2;
    dmg = pokeRound(dmg * f);
    return Math.max(1, dmg);
  }
  function statusImmune(mon, st, ignoreType) {
    const t = mon.types, a = abil(mon);
    if (a === 'Purifying Salt' || a === 'Comatose' || (a === 'Shields Down' && !mon.core)) return true;
    if (a === 'Leaf Guard' && weather() === 'sun') return true;
    if (STATUS_GUARD[a] && STATUS_GUARD[a].includes(st)) return true;
    if (grounded(mon) && (terrain() === 'misty' || (terrain() === 'electric' && st === 'slp'))) return true;
    if (st === 'frz' && weather() === 'sun') return true;
    if (ignoreType && (st === 'psn' || st === 'tox')) return false;
    return (st === 'brn' && t.includes('Fire')) || (st === 'par' && t.includes('Electric')) ||
      ((st === 'psn' || st === 'tox') && (t.includes('Poison') || t.includes('Steel'))) || (st === 'frz' && t.includes('Ice'));
  }
  // Why a status move from u would fail against t (or null if it works)
  function statusBlock(u, t, name) {
    const m = MOVES[name];
    const targetsFoe = m.inflict || m.tgt || (m.vol && !['substitute', 'endure', 'destinybond', 'focusenergy', 'aquaring', 'ingrain', 'charge', 'roost'].includes(m.vol) && !m.protect) || (m.phaze && m.cat === 'x');
    if (!targetsFoe) return null;
    if (abil(u) === 'Prankster' && t.types.includes('Dark')) return 'dark';
    const tA = abil(u) === 'Mycelium Might' ? null : defAbil(u, t);
    if (tA === 'Good as Gold') return 'gold';
    if (tA === 'Magic Bounce' && m.reflectable) return 'bounce';
    if (m.powder && (t.types.includes('Grass') || tA === 'Overcoat')) return 'powder';
    if (m.inflict && absorbedBy(u, t, m.type)) return 'absorb';
    if (m.inflict === 'par' && m.type === 'Electric' && typeEff('Electric', t) === 0) return 'type';
    if (t.v.sub && !m.sound && !m.bypassSub && abil(u) !== 'Infiltrator') return 'sub';
    return null;
  }

  // ---------- Move availability ----------
  // Moves this Pokémon can pick right now (PP, Disable, Taunt, Encore, can't-use-twice); Struggle if none
  function usableMoves(mon) {
    const v = mon.v || {}, pp = mon.pp || {};
    const list = mon.moves.filter(n => {
      const m = MOVES[n];
      if (!m || m.unsupported || (pp[n] !== undefined && pp[n] <= 0)) return false;
      if (v.disable && v.disable.move === n) return false;
      if (v.taunt && m.cat === 'x') return false;
      if (v.encore && v.encore.move !== n) return false;
      if (m.noRepeat && v.lastMove === n) return false;
      return true;
    });
    return list.length ? list : ['Struggle'];
  }
  // An action this Pokémon is forced into (recharge turn, second turn of a charge move, Outrage lock)
  function forcedAction(mon) {
    const v = mon.v || {};
    if (v.recharge) return { kind: 'recharge' };
    if (v.charging) return { kind: 'move', move: v.charging, forced: true };
    if (v.lock) return { kind: 'move', move: v.lock.move, forced: true };
    return null;
  }
  // Can this side switch out by choice? (abilities, partial trapping, No Retreat, Ingrain)
  function canSwitch(side) {
    const m = act(side), v = m.v || {};
    if (forcedAction(m)) return false;
    if (m.types.includes('Ghost')) return true;
    return !trappedBy(side) && !v.partial && !v.trapped && !v.noretreat && !v.ingrain;
  }
  const skipsCharge = (a, m) => (['solarbeam', 'solarblade'].includes(m.special) && weather() === 'sun') || (m.special === 'electroshot' && weather() === 'rain');

  // ---------- Boss decisions ----------
  const avgHits = (a, m) => !m.multi ? 1 : Array.isArray(m.multi) ? (abil(a) === 'Skill Link' ? 5 : 3.1) : m.multi;
  // Expected damage (average roll, accuracy and number of hits included)
  function expDmg(a, d, n) {
    const m = MOVES[n]; if (!m || m.cat === 'x') return 0;
    if (['counter', 'mirrorcoat', 'metalburst', 'comeuppance'].includes(m.special)) return 0;
    if (m.ohko) return d.level > a.level || (m.ohko === 'Ice' && d.types.includes('Ice')) ? 0 : d.hp * 0.3;
    let dmg = calc(a, d, m, 0.925, false, { hit: 2 }) * (m.special === 'tripleaxel' || m.special === 'triplekick' ? 3 : avgHits(a, m));
    dmg *= m.acc ? Math.min(1, m.acc / 100) : 1;
    if (m.charge && !m.invuln && !skipsCharge(a, m)) dmg *= 0.5;
    if (m.recharge) dmg *= 0.75;
    return dmg;
  }
  const choices = mon => (G && G.battle && mon.pp) ? usableMoves(mon) : mon.moves;
  function bestMove(a, d) {
    let best = { n: null, dmg: 0 };
    for (const n of choices(a)) { const x = expDmg(a, d, n); if (x > best.dmg) best = { n, dmg: x }; }
    return best;
  }
  const bestFrac = (a, d) => bestMove(a, d).dmg / Math.max(1, d.hp);
  const trickRoom = () => !!(G && G.battle && G.battle.field && G.battle.field.trickroom);
  const faster = (a, d) => trickRoom() ? speed(a) < speed(d) : speed(a) > speed(d);
  const movesFirst = (a, an, d, dn) => {
    const pa = an ? prio(a, an) : 0, pd = dn ? prio(d, dn) : 0;
    return pa !== pd ? pa > pd : faster(a, d);
  };
  const HEALS = ['synthesis', 'morningsun', 'moonlight', 'shoreup', 'roost', 'strengthsap'];
  const hazardsOn = sd => sd && (sd.stealthrock || sd.spikes || sd.toxicspikes || sd.stickyweb);

  // Value of a status (or utility) move for the boss; -1 = useless or would fail
  function utilityScore(n, b, p, hard) {
    const m = MOVES[n], sp = m.special, B = G.battle, mine = B.side.b, theirs = B.side.p;
    const hpF = b.hp / b.maxhp, pb = bestMove(p, b), threat = pb.dmg / Math.max(1, b.hp);
    const pAlive = B.p.filter(x => x.hp > 0).length, bAlive = B.b.filter(x => x.hp > 0).length;
    const why = statusBlock(b, p, n);
    if (why) return -1;
    if (m.heal || HEALS.includes(sp)) return hpF < 0.5 && threat < 0.9 ? 1.1 : hpF < 0.75 ? 0.25 : -1;
    if (sp === 'wish') return mine.wish ? -1 : hpF < 0.7 ? 0.7 : 0.15;
    if (sp === 'rest') return (hpF < 0.4 && !b.status) || (b.status && b.status !== 'slp' && hpF < 0.7) ? 0.9 : -1;
    if (sp === 'sleeptalk') return b.status === 'slp' && b.slp > 1 ? 1.3 : -1;
    if (sp === 'painsplit') return p.hp > b.hp * 1.4 ? 0.9 : -1;
    if (m.protect) return b.v.stall || b.v.lastMove === n ? -1 : (['psn', 'tox', 'brn'].includes(p.status) || p.v.seed || p.v.perish || p.v.yawn || mine.wish || abil(b) === 'Speed Boost') ? 0.95 : hard ? 0.1 : 0.2;
    if (m.vol === 'endure') return -1;
    if (m.vol === 'substitute') return b.v.sub || hpF <= 0.5 ? -1 : threat < 0.25 ? 0.85 : 0.15;
    if (m.side) {
      const s = m.sideFoe ? theirs : mine, k = m.side;
      if (k === 'stealthrock') return s.stealthrock || pAlive < 3 ? -1 : 1.05;
      if (k === 'spikes') return (s.spikes || 0) >= 3 || pAlive < 3 ? -1 : 0.85 - 0.2 * (s.spikes || 0);
      if (k === 'toxicspikes') return (s.toxicspikes || 0) >= 2 || pAlive < 3 ? -1 : 0.6;
      if (k === 'stickyweb') return s.stickyweb || pAlive < 3 ? -1 : 0.75;
      if (k === 'reflect' || k === 'lightscreen' || k === 'auroraveil') {
        if (s[k] || (k === 'auroraveil' && weather() !== 'snow')) return -1;
        const phys = p.st.atk > p.st.spa;
        return k === 'auroraveil' || (k === 'reflect') === phys ? 0.8 : 0.3;
      }
      if (k === 'tailwind') return s.tailwind ? -1 : speed(b) < speed(p) ? 0.8 : 0.3;
      return s[k] ? -1 : 0.2;
    }
    if (['defog', 'courtchange', 'tidyup'].includes(sp)) return hazardsOn(mine) ? 0.95 : sp === 'defog' && (theirs.reflect || theirs.lightscreen || theirs.auroraveil) ? 0.6 : -1;
    if (m.field === 'trickroom') {
      if (B.field.trickroom) return -1;
      const avg = B.b.filter(x => x.hp > 0).reduce((s, x) => s + x.st.spe, 0) / bAlive;
      return avg < p.st.spe ? 0.9 : -1;
    }
    if (m.weather) return weather() === m.weather ? -1 : B.b.some(x => x.hp > 0 && (WEATHER_SPEED[abil(x)] === m.weather)) ? 0.8 : 0.3;
    if (m.terrain) return terrain() === m.terrain ? -1 : 0.4;
    if (m.phaze) return Object.values(p.boosts).reduce((s, v) => s + Math.max(0, v), 0) >= 2 ? 1.3 : hazardsOn(theirs) && pAlive > 1 ? 0.5 : 0.1;
    if (m.vol === 'leechseed') return p.v.seed || p.types.includes('Grass') ? -1 : 0.75;
    if (m.vol === 'taunt') return p.v.taunt ? -1 : p.moves.filter(x => MOVES[x] && MOVES[x].cat === 'x').length >= 2 ? 0.8 : 0.15;
    if (m.vol === 'encore') return !p.v.lastMove || p.v.encore || !MOVES[p.v.lastMove] || MOVES[p.v.lastMove].cat !== 'x' ? -1 : 1.0;
    if (m.vol === 'disable') return !p.v.lastMove || p.v.disable ? -1 : 0.4;
    if (m.vol === 'yawn') return p.status || p.v.yawn ? -1 : 0.6;
    if (m.vol === 'confusion') return p.v.confusion || abil(p) === 'Own Tempo' ? -1 : (hard && m.tgt && m.tgt.atk > 0 && p.st.atk > p.st.spa) ? -1 : 0.45;
    if (m.vol === 'destinybond') return b.v.lastMove === n ? -1 : pb.dmg >= b.hp && faster(b, p) ? 1.3 : -1;
    if (m.vol === 'focusenergy') return b.v.focus ? -1 : 0.2;
    if (m.vol === 'aquaring' || m.vol === 'ingrain') return b.v[m.vol] ? -1 : 0.3;
    if (sp === 'curse' && b.types.includes('Ghost')) return p.v.curse || hpF < 0.6 ? -1 : 0.5;
    if (m.selfKO && m.cat === 'x') return pb.dmg >= b.hp && bAlive > 1 ? 0.9 : -1;
    if (sp === 'haze' || sp === 'clearsmog') return Object.values(p.boosts).some(v => v >= 2) ? 1.2 : -1;
    if (sp === 'healbell' || sp === 'aromatherapy') return B.b.some(x => x.hp > 0 && x.status) ? 0.7 : -1;
    if (sp === 'perishsong') return p.v.perish || b.v.perish ? -1 : 0.2;
    if (sp === 'psychup') return Object.values(p.boosts).some(v => v >= 2) ? 0.7 : -1;
    if (sp === 'transform') return 0.3;
    if (m.pivot && m.cat === 'x') return bAlive > 1 && canSwitch('b') && threat > 0.5 ? 0.8 : -1;
    if (m.inflict) {
      if (p.status || statusImmune(p, m.inflict)) return -1;
      const safe = threat < 1, acc = m.acc ? m.acc / 100 : 1;
      let s = 0.45;
      if (m.inflict === 'slp') s = safe ? 1.3 : 0.25;
      else if (m.inflict === 'brn') s = safe && p.st.atk > p.st.spa ? 1.2 : 0.3;
      else if (m.inflict === 'par') s = safe && speed(p) > speed(b) ? 1.1 : 0.35;
      else if (m.inflict === 'tox') s = safe && p.maxhp > 330 ? 0.8 : 0.35;
      if (!hard) s = m.inflict === 'slp' ? 0.85 : 0.45;
      return s * acc;
    }
    if (m.tgt && m.cat === 'x') return 0.25;
    if (m.setup || (m.self && Object.values(m.self).some(v => v > 0))) {
      if (hard) return 0.05;
      const ups = Object.entries(m.self || { atk: 1 }).filter(([, v]) => v > 0).map(([k]) => b.boosts[k]);
      return hpF > 0.6 && threat < 0.55 && Math.max(...ups) < 2 ? 0.7 : 0.05;
    }
    return 0.1;
  }

  // Normal difficulty: decent but simple
  function scoreNormal(n, b, p) {
    const m = MOVES[n];
    if (m.cat === 'x') return utilityScore(n, b, p, false);
    if (eff(b, m, p) === 0 || absorbedBy(b, p, moveType(b, m))) return 0;
    const exp = expDmg(b, p, n);
    let s = Math.min(exp / p.hp, 1);
    if (exp >= p.hp) { s = 2; if (prio(b, n) > 0 && !faster(b, p)) s += 0.6; }
    if (m.special === 'suckerpunch' || m.special === 'thunderclap') s *= 0.85;
    if (m.special === 'fakeout') s = isFresh(b) ? 0.9 : 0;
    if (m.selfKO) s *= 0.4;
    if (m.recoil && exp < p.hp) s *= 0.95;
    return s;
  }

  // Hard difficulty: predicts the player's strongest move, plays around speed, KOs, status and the field
  function scoreHard(n, b, p) {
    const m = MOVES[n], B = G.battle;
    const pb = bestMove(p, b);
    const pKOs = pb.dmg >= b.hp;
    const pFirst = pb.n ? movesFirst(p, pb.n, b, n) : false;
    if (m.cat === 'x') {
      const u = utilityScore(n, b, p, true);
      return u < 0 ? -1 : (pKOs && pFirst && !m.protect) ? u * 0.2 : u;
    }
    if (eff(b, m, p) === 0 || absorbedBy(b, p, moveType(b, m)) || blockedBy(b, p, m)) return -1;
    if ((m.special === 'suckerpunch' || m.special === 'thunderclap') && !pb.n) return -1;
    if ((m.special === 'fakeout' || m.special === 'firstimpression') && !isFresh(b)) return -1;
    if (m.special === 'dreameater' && p.status !== 'slp') return -1;
    if (m.special === 'focuspunch' && pb.dmg > 0) return -1;
    const d = expDmg(b, p, n), acc = m.acc ? Math.min(1, m.acc / 100) : 1;
    let s = Math.min(d / p.hp, 1);
    const minHit = calc(b, p, m, 0.85, false, { hit: 2 }) * (m.multi ? (Array.isArray(m.multi) ? (abil(b) === 'Skill Link' ? 5 : 2) : m.multi) : 1);
    if (minHit >= p.hp && !(m.charge && !m.invuln && !skipsCharge(b, m))) s = 2 + acc;   // guaranteed KO if it hits
    else if (d * 1.15 >= p.hp) s = 1.5 + acc / 2;                                        // likely KO
    else if (2 * d >= p.hp) s += 0.15;                                                   // 2HKO
    if (pKOs && pFirst) s *= 0.15;                                                       // we won't get to use it
    else if (pKOs && s >= 2) s += 0.5;
    if (m.special === 'fakeout') s += 0.6;
    if (m.special === 'suckerpunch' || m.special === 'thunderclap') s *= 0.9;
    if (m.recoil && s < 2 && b.hp / b.maxhp < 0.3) s *= 0.8;
    if (m.self && Object.values(m.self).some(v => v < 0) && s < 2) s *= 0.92;
    if (m.crash && s < 2) s *= 0.9;
    if (m.recharge && s < 2) s *= 0.6;
    if (m.selfKO) s = pKOs && !pFirst ? s + 0.3 : s * 0.25;
    if (m.phaze && Object.values(p.boosts).reduce((t, v) => t + Math.max(0, v), 0) >= 2) s += 0.8;
    if (m.contact && ['Rough Skin', 'Iron Barbs', 'Flame Body', 'Static'].includes(abil(p)) && s < 2) s *= 0.93;
    if (p.v.sub && m.multi) s += 0.2;
    if (['rapidspin', 'mortalspin'].includes(m.special) && hazardsOn(B.side.b)) s += 0.6;
    return s;
  }

  // Fraction of max HP a Pokémon would lose to hazards on its side
  function entryHazardFrac(m, sd) {
    if (!sd || abil(m) === 'Magic Guard') return 0;
    let f = 0;
    if (sd.stealthrock) f += typeEff('Rock', m) / 8;
    if (sd.spikes && grounded(m)) f += [0, 1 / 8, 1 / 6, 1 / 4][sd.spikes];
    return f;
  }

  // ---------- Hard: one-turn lookahead ----------
  // Runs fn with some Pokémon's HP set to hypothetical values, then puts them back.
  // (The real objects are used because damage code looks up which side a Pokémon is on.)
  function withHP(changes, fn) {
    const saved = changes.map(([m]) => m.hp);
    changes.forEach(([m, hp]) => { m.hp = Math.max(0, Math.min(m.maxhp, Math.round(hp))); });
    try { return fn(); } finally { changes.forEach(([m], i) => { m.hp = saved[i]; }); }
  }
  // Who wins a straight exchange between a and d: about +1 if a wins comfortably, -1 if d does
  function matchup(a, d) {
    if (a.hp <= 0) return -1;
    if (d.hp <= 0) return 1;
    const ad = bestMove(a, d), da = bestMove(d, a);
    const ta = ad.dmg > 0 ? Math.ceil(d.hp / ad.dmg) : 9, td = da.dmg > 0 ? Math.ceil(a.hp / da.dmg) : 9;
    const aFirst = ad.n ? movesFirst(a, ad.n, d, da.n) : false;
    if (ta < td || (ta === td && aFirst)) return Math.min(1, 0.4 + 0.15 * (td - ta) + 0.3 * a.hp / a.maxhp);
    return -Math.min(1, 0.4 + 0.15 * (ta - td) + 0.3 * d.hp / d.maxhp);
  }
  // The teammate the boss would bring in, given the player's predicted move (null = no hit coming)
  function bossSwitchTarget(p, pMove, exclude) {
    const B = G.battle;
    let best = -1, top = -Infinity;
    B.b.forEach((c, i) => {
      if (i === exclude || i === B.ba || c.hp <= 0) return;
      const take = (pMove ? expDmg(p, c, pMove) / c.hp : 0) + entryHazardFrac(c, B.side.b);
      const after = Math.max(0, c.hp - take * c.hp);
      const score = withHP([[c, after]], () => matchup(c, p)) - 1.2 * take - (i === B.b.length - 1 ? 0.25 : 0);
      if (score > top) { top = score; best = i; }
    });
    return best;
  }
  // Simulates one turn with expected damage and returns the position from the boss's view.
  // bOpt / pOpt: { kind: 'move', move } or { kind: 'switch', to }
  function simTurn(bOpt, pOpt, noPivot) {
    const B = G.battle;
    let b = act('b'), p = act('p');
    const hp = new Map([...B.b, ...B.p].map(m => [m, m.hp]));
    const hit = (m, amt) => hp.set(m, Math.max(0, hp.get(m) - amt));
    let utility = 0;
    if (bOpt.kind === 'switch') { b = B.b[bOpt.to]; hit(b, entryHazardFrac(b, B.side.b) * b.maxhp); }
    if (pOpt.kind === 'switch') { p = B.p[pOpt.to]; hit(p, entryHazardFrac(p, B.side.p) * p.maxhp); }
    const bm = bOpt.kind === 'move' ? MOVES[bOpt.move] : null, pm = pOpt.kind === 'move' ? MOVES[pOpt.move] : null;
    const protects = bm && bm.protect && !b.v.stall;
    const bossAttack = () => {
      if (!bm || hp.get(b) <= 0 || hp.get(p) <= 0) return;
      if (bm.cat === 'x') { utility += 0.3 * Math.max(0, utilityScore(bOpt.move, b, p, true)); return; }
      const dmg = withHP([[b, hp.get(b)], [p, hp.get(p)]], () => expDmg(b, p, bOpt.move));
      hit(p, dmg);
      if (bm.recoil) hit(b, dmg * bm.recoil);
      if (bm.drain) hp.set(b, Math.min(b.maxhp, hp.get(b) + dmg * bm.drain));
      if (bm.selfKO) hp.set(b, 0);
    };
    const bossPivot = () => {
      if (noPivot || !bm || !bm.pivot || hp.get(b) <= 0 || !canSwitch('b')) return;
      if (B.bPivoted === B.turn - 1) return;   // no ping-ponging on consecutive turns
      const i = bossSwitchTarget(p, pm && pm.cat !== 'x' && !playerMoved ? pOpt.move : null);
      if (i >= 0) { b = B.b[i]; hit(b, entryHazardFrac(b, B.side.b) * b.maxhp); }
    };
    let playerMoved = false;
    const playerAttack = () => {
      playerMoved = true;
      if (!pm || pm.cat === 'x' || hp.get(p) <= 0 || hp.get(b) <= 0 || protects) return;
      const dmg = withHP([[b, hp.get(b)], [p, hp.get(p)]], () => expDmg(p, b, pOpt.move));
      hit(b, dmg);
      if (pm.recoil) hit(p, dmg * pm.recoil);
    };
    const bFirst = bm && pm ? movesFirst(b, bOpt.move, p, pOpt.move) : !!bm;
    if (bFirst) { bossAttack(); bossPivot(); playerAttack(); }
    else { playerAttack(); bossAttack(); bossPivot(); }
    // Value of the position: HP left on each side, knockouts, and who wins the next exchange
    let v = utility;
    for (const m of B.b) v += hp.get(m) / m.maxhp - (m.hp > 0 && hp.get(m) <= 0 ? 0.5 : 0);
    for (const m of B.p) v -= hp.get(m) / m.maxhp - (m.hp > 0 && hp.get(m) <= 0 ? 0.5 : 0);
    if (hp.get(b) > 0 && hp.get(p) > 0) v += 0.5 * withHP([[b, hp.get(b)], [p, hp.get(p)]], () => matchup(b, p));
    // A knocked-out Pokémon's replacement comes in for free, without taking a hit
    const freeEntry = (team, foe) => Math.max(0, ...team.filter(c => hp.get(c) > 0).map(c => withHP([[c, hp.get(c)], [foe, hp.get(foe)]], () => matchup(c, foe))));
    if (hp.get(b) <= 0 && hp.get(p) > 0) v += 0.3 * freeEntry(B.b, p);
    if (hp.get(p) <= 0 && hp.get(b) > 0) v -= 0.3 * freeEntry(B.p, b);
    return v;
  }
  // The player's likely replies, weighted: usually their strongest move on the boss, sometimes their
  // second, and their best switch-in when the boss threatens a KO
  function playerReplies(b, p) {
    const B = G.battle;
    const moves = choices(p).map(n => [n, expDmg(p, b, n)]).sort((x, y) => y[1] - x[1]);
    const replies = [{ kind: 'move', move: moves.length ? moves[0][0] : 'Struggle', w: 0.7 }];
    if (moves[1] && moves[1][1] > 0) replies.push({ kind: 'move', move: moves[1][0], w: 0.1 });
    if (bestMove(b, p).dmg >= p.hp * 0.6 && canSwitch('p')) {
      let best = -1, top = -Infinity;
      for (const i of benchAlive('p')) { const s = matchup(B.p[i], b); if (s > top) { top = s; best = i; } }
      if (best >= 0) replies.push({ kind: 'switch', to: best, w: 0.2 });
    }
    return replies;
  }
  // Expected value of a boss option over the player's replies, with a little weight on the worst case
  function simValue(opt, replies, noPivot) {
    let sum = 0, wsum = 0, low = Infinity;
    for (const r of replies) { const v = simTurn(opt, r, noPivot); sum += r.w * v; wsum += r.w; low = Math.min(low, v); }
    return 0.8 * sum / wsum + 0.2 * low;
  }
  // Hard: attacks are chosen by scoreHard; the lookahead decides what a switch is worth,
  // both for switching out directly and for the switch at the end of U-turn and the like
  function hardAction(b, p) {
    const B = G.battle, replies = playerReplies(b, p);
    const canPivot = canSwitch('b') && benchAlive('b').length > 0, justPivoted = B.bPivoted === B.turn - 1;
    const scored = usableMoves(b).map(n => {
      const m = MOVES[n];
      let s = scoreHard(n, b, p);
      if (m.pivot && s >= 0) {
        if (!canPivot) s = m.cat === 'x' ? -1 : s;
        else if (justPivoted) s = m.cat === 'x' ? -1 : s * 0.4;   // just came in by a switching move: don't bounce straight out
        else {
          const gain = simValue({ kind: 'move', move: n }, replies) - simValue({ kind: 'move', move: n }, replies, true);
          s = m.cat === 'x' ? (gain > 0.15 ? 0.5 + gain : -1) : s + Math.max(0, Math.min(0.3, gain));
        }
      }
      return [n, s + Math.random() * 0.03];
    }).sort((x, y) => y[1] - x[1]);
    const move = scored[0][0];
    if ((B.bStreak || 0) < 2 && canPivot) {
      let sw = -1, top = simValue({ kind: 'move', move }, replies) + 0.5;   // switching must clearly beat attacking
      for (const i of benchAlive('b')) { const v = simValue({ kind: 'switch', to: i }, replies); if (v > top) { top = v; sw = i; } }
      if (sw >= 0) return { kind: 'switch', to: sw };
    }
    return { kind: 'move', move };
  }

  function bossAction() {
    const b = act('b'), p = act('p'), B = G.battle;
    const forced = forcedAction(b); if (forced) return forced;
    const moves = usableMoves(b);
    if (G.diff === 'hard') {
      const choice = b.v.perish === 1 && canSwitch('b') && benchAlive('b').length ? { kind: 'switch', to: bossSwitchTarget(p, null) } : hardAction(b, p);
      B.bStreak = choice.kind === 'switch' ? (B.bStreak || 0) + 1 : 0;
      return choice;
    }
    const sensible = moves.filter(n => scoreNormal(n, b, p) > 0);
    if (Math.random() < 0.3) return { kind: 'move', move: pickRand(sensible.length ? sensible : moves) };
    const scored = moves.map(n => [n, scoreNormal(n, b, p) + Math.random() * 0.02]).sort((x, y) => y[1] - x[1]);
    return { kind: 'move', move: scored[0][0] };
  }

  // Which Pokémon the boss sends in next (after a faint, or mid-turn after U-turn and the like)
  function bossNext(excludeActive) {
    const B = G.battle;
    const alive = B.b.map((m, i) => i).filter(i => B.b[i].hp > 0 && !(excludeActive && i === B.ba));
    if (!alive.length) return -1;
    if (G.diff !== 'hard') return alive[0];
    const p = act('p');
    if (p.hp <= 0) return alive[0];
    // Mid-turn switch before the player has moved: pick whoever takes their predicted hit best
    const pa = B.acts && B.acts.p;
    if (excludeActive && pa && pa.kind === 'move' && B.acted && !B.acted.p && MOVES[pa.move] && MOVES[pa.move].cat !== 'x') {
      const i = bossSwitchTarget(p, pa.move);
      if (i >= 0) return i;
    }
    const last = B.b.length - 1;
    const rate = i => {
      const c = B.b[i], after = c.hp * (1 - entryHazardFrac(c, B.side.b));
      const mine = bestMove(c, p);
      const revenge = mine.dmg >= p.hp && movesFirst(c, mine.n, p, bestMove(p, c).n) ? 1 : 0;   // outspeeds and KOs
      const hold = i === last && alive.length > 1 ? 0.3 : 0;                                       // keep the ace for later
      return withHP([[c, after]], () => matchup(c, p)) + revenge - hold;
    };
    return alive.map(i => [i, rate(i)]).sort((x, y) => y[1] - x[1])[0][0];
  }

  // ---------- Battle state helpers ----------
  const act = s => s === 'p' ? G.battle.p[G.battle.pa] : G.battle.b[G.battle.ba];
  const other = s => s === 'p' ? 'b' : 'p';
  const label = (s, m) => s === 'p' ? m.name : `The foe's ${m.name}`;
  const team = s => s === 'p' ? 'your team' : "the foe's team";
  const delay = () => 700 / (save.settings.speed || 1);
  const isFresh = m => m.v && m.v.enteredTurn === G.battle.turn - 1;
  const benchAlive = s => { const B = G.battle, list = s === 'p' ? B.p : B.b, cur = s === 'p' ? B.pa : B.ba; return list.map((m, i) => i).filter(i => i !== cur && list[i].hp > 0); };
  // Which foe ability (if any) stops this side from switching out
  function trappedBy(side) {
    const me = act(side), foe = act(other(side)), fa = abil(foe);
    if (me.hp <= 0 || foe.hp <= 0 || me.types.includes('Ghost') || !TRAPPERS[fa]) return null;
    if (fa === 'Shadow Tag' && abil(me) === 'Shadow Tag') return null;
    return TRAPPERS[fa](me) ? fa : null;
  }

  async function say(msg, cls = '') {
    msg = msg.replace(/(.)The foe's/g, "$1the foe's");
    const B = G.battle;
    B.log.push([msg, cls]); if (B.log.length > 80) B.log.shift();
    const log = $('#log');
    if (log) { const p = document.createElement('p'); p.className = cls; p.textContent = msg; log.appendChild(p); log.scrollTop = log.scrollHeight; }
    refresh();
    await sleep(cls === 'turn' ? Math.min(120, delay()) : delay());
  }
  function anim(side, cls) {
    const el = $(side === 'p' ? '#me-img' : '#foe-img'); if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    if (cls === 'hit') setTimeout(() => el.classList.remove('hit'), 450);
  }
  // The player chooses who comes in mid-turn (U-turn, Baton Pass...)
  let pendingPick = null;
  function pickSwitch(reason) {
    G.battle.need = reason; renderControls();
    return new Promise(res => { pendingPick = res; });
  }

  // ---------- Turn engine ----------
  async function runTurn(pAct) {
    if (busy) return;
    busy = true; renderControls();
    const B = G.battle;
    ensureBattle(B);
    B.turn++;
    for (const s of ['p', 'b']) { const m = act(s); m.v.hitBy = null; m.v.fpHit = false; }
    const pForced = forcedAction(act('p'));
    if (pForced) pAct = pForced;
    const bAct = bossAction();
    B.acts = { p: pAct, b: bAct };
    B.acted = { p: false, b: false };
    B.selfKO = null;
    await say(`Turn ${B.turn}`, 'turn');

    for (const s of ['p', 'b']) {
      const a = B.acts[s];
      if (a.kind === 'move' && !a.forced && MOVES[a.move] && MOVES[a.move].special === 'focuspunch') await say(`${label(s, act(s))} is tightening its focus!`, s === 'b' ? 'foe' : '');
    }
    // Switches happen first; Pursuit hits a Pokémon that's switching out
    for (const s of ['p', 'b']) {
      if (B.acts[s].kind !== 'switch') continue;
      const o = other(s), oa = B.acts[o];
      if (oa.kind === 'move' && MOVES[oa.move].special === 'pursuit' && act(o).hp > 0 && act(s).hp > 0) {
        await useMove(o, oa.move, { pursuit: true, movedFirst: true }); B.acted[o] = true;
      }
      if (act(s).hp > 0) await switchIn(s, B.acts[s].to, true);
      B.acted[s] = true;
    }
    for (const s of ['p', 'b']) {
      if (B.acts[s].kind !== 'recharge') continue;
      act(s).v.recharge = false; B.acted[s] = true;
      await say(`${label(s, act(s))} must recharge!`, s === 'b' ? 'foe' : '');
    }
    const order = ['p', 'b'].filter(s => B.acts[s].kind === 'move' && !B.acted[s]);
    order.sort((x, y) => {
      const px = prio(act(x), B.acts[x].move), py = prio(act(y), B.acts[y].move);
      if (px !== py) return py - px;
      const lx = movesLast(act(x), B.acts[x].move), ly = movesLast(act(y), B.acts[y].move);
      if (lx !== ly) return lx ? 1 : -1;
      const sx = speed(act(x)), sy = speed(act(y));
      if (sx !== sy) return trickRoom() ? sx - sy : sy - sx;
      return Math.random() < 0.5 ? -1 : 1;
    });
    for (const s of order) {
      if (act(s).hp <= 0 || B.acted[s]) continue;
      await useMove(s, B.acts[s].move, { movedFirst: !B.acted[other(s)], movedLast: B.acted[other(s)], forced: B.acts[s].forced });
      B.acted[s] = true;
      await syncForm('p'); await syncForm('b');
      if (G.phase === 'done') return;
    }
    await endOfTurn();
    await afterFaints();
    if (G.battle !== B) return; // a newer battle started while this turn was finishing
    busy = false;
    if (G.phase === 'done') return;
    persistRun();
    renderControls();
    discordReport();
  }

  async function afterFaints() {
    const B = G.battle;
    const pDead = B.p.every(m => m.hp <= 0), bDead = B.b.every(m => m.hp <= 0);
    // Both sides wiped out at once: whoever caused it (Explosion, Destiny Bond...) loses
    if (bDead && pDead) return finish(B.selfKO === 'b');
    if (bDead) return finish(true);
    if (pDead) return finish(false);
    if (act('b').hp <= 0) await switchIn('b', bossNext(), false);
    if (act('p').hp <= 0) { B.need = 'switch'; }
    // Wimp Out / Emergency Exit: retreat after dropping below half HP
    for (const side of ['b', 'p']) {
      const m = act(side);
      if (!m.wimp) continue;
      m.wimp = false;
      if (m.hp <= 0 || !benchAlive(side).length) continue;
      await say(`${label(side, m)} retreated with ${abil(m)}!`, side === 'b' ? 'foe' : '');
      if (side === 'b') await switchIn('b', bossNext(true), true);
      else B.need = 'retreat';
    }
  }

  // Volatile effects Baton Pass hands to the next Pokémon
  const PASSED = ['sub', 'confusion', 'focus', 'seed', 'curse', 'aquaring', 'ingrain', 'perish'];
  async function switchIn(side, i, voluntary, opts = {}) {
    const B = G.battle, old = act(side), boss = bossOf(G), cls = side === 'b' ? 'foe' : '';
    if (voluntary && old.hp > 0 && !opts.dragged) await say(side === 'p' ? `Come back, ${old.name}!` : `${boss.name} withdrew ${old.name}!`, cls);
    const pass = opts.pass && old.hp > 0 ? { boosts: Object.assign({}, old.boosts), v: Object.fromEntries(PASSED.filter(k => old.v[k]).map(k => [k, old.v[k]])) } : null;
    if (old.hp > 0 && abil(old) === 'Natural Cure') old.status = null;
    if (old.hp > 0 && abil(old) === 'Regenerator') old.hp = Math.min(old.maxhp, old.hp + Math.floor(old.maxhp / 3));
    if (old.base) { old.st = old.base.st; old.moves = old.base.moves; old.pp = old.base.pp || old.pp; old.base = null; old.dispId = null; }  // undo Imposter / Transform
    if (FORM_ABILS.includes(baseAbil(old)) && !old.complete) {
      if (baseAbil(old) === 'Zero to Hero' && old.hp > 0) old.hero = true;
      setForm(old, old.hero ? FORMS['Zero to Hero'] : DEX[old.name].stats);
      old.blade = old.school = old.core = old.zen = false;
    }
    old.boosts = freshBoosts();
    old.types = DEX[old.name].types.slice();
    old.ff = false; old.prot = false; old.loaf = false; old.abil = null; old.charged = false; old.wimp = false;
    old.v = {};
    if (old.status === 'tox') old.tox = 1;
    // The foe is freed from anything this Pokémon was holding it with
    const foe = act(other(side));
    if (foe && foe.v) { delete foe.v.partial; delete foe.v.trapped; }
    if (side === 'p') B.pa = i; else B.ba = i;
    const nw = act(side);
    ensureMon(nw);
    nw.v.enteredTurn = B.turn;
    if (voluntary) nw.entered = B.turn;
    if (pass) { Object.assign(nw.boosts, pass.boosts); Object.assign(nw.v, pass.v); }
    if (opts.shed) nw.v.sub = opts.shed;
    renderSprites();
    await say(opts.dragged ? `${label(side, nw)} was dragged out!` : side === 'p' ? goText(nw) : `${boss.name} sent out ${nw.name}!`, cls);
    if (side === 'p' && nw.shiny) FX.shiny('p');
    await hazardsOnEntry(side);
    if (nw.hp > 0) await onEntry(side);
  }

  const goText = m => m.shiny ? `✨ Go! Shiny ${m.name}!` : `Go! ${m.name}!`;

  async function hazardsOnEntry(side) {
    const B = G.battle, sd = B.side[side], m = act(side), L = label(side, m), cls = side === 'b' ? 'foe' : '';
    if (!sd || m.hp <= 0) return;
    if (sd.healingwish) {
      delete sd.healingwish;
      if (m.hp < m.maxhp || m.status) { m.hp = m.maxhp; m.status = null; await say(`The healing wish came true for ${L}!`, cls); }
    }
    const guard = abil(m) === 'Magic Guard';
    if (sd.stealthrock && !guard) await hurt(side, Math.max(1, Math.floor(m.maxhp * typeEff('Rock', m) / 8)), `Pointed stones dug into ${L}!`);
    if (m.hp > 0 && sd.spikes && grounded(m) && !guard) await hurt(side, Math.floor(m.maxhp * [0, 1 / 8, 1 / 6, 1 / 4][sd.spikes]), `${L} was hurt by the spikes!`);
    if (m.hp > 0 && sd.toxicspikes && grounded(m)) {
      if (m.types.includes('Poison')) { delete sd.toxicspikes; await say(`${L} absorbed the toxic spikes!`, cls); }
      else if (!m.status && !m.v.sub) await inflict(side, sd.toxicspikes >= 2 ? 'tox' : 'psn', true, null);
    }
    if (m.hp > 0 && sd.stickyweb && grounded(m)) { await say(`${L} was caught in a sticky web!`, cls); await lowerByFoe(side, { spe: -1 }, other(side)); }
  }

  async function onEntry(side) {
    const m = act(side), o = act(other(side)), a = abil(m), L = label(side, m);
    if (m.hp <= 0) return;
    const cls = side === 'b' ? 'foe' : '', O = label(other(side), o);
    if (a === 'Neutralizing Gas') await say('Neutralizing gas filled the area!', cls);
    if (a === 'Trace' && o.hp > 0 && abil(o) && !NO_COPY.includes(abil(o))) {
      m.abil = abil(o);
      await say(`${L} traced ${O}'s ${m.abil}!`, cls);
      return onEntry(side);
    }
    if (a === 'Imposter' && o.hp > 0 && !m.base) await transformInto(side);
    if (a === 'Intimidate' && o.hp > 0) {
      const oa = abil(o);
      await say(`${L}'s Intimidate!`, cls);
      if (o.v && o.v.sub) await say(`${O} is protected by its substitute!`);
      else if (oa === 'Guard Dog') { await say(`${O}'s Guard Dog!`); await boost(other(side), { atk: 1 }); }
      else if (NO_INTIMIDATE.includes(oa)) await say(`${O}'s ${oa} prevents it!`);
      else await lowerByFoe(other(side), { atk: -1 }, side);
      if (oa === 'Rattled' && o.hp > 0) { await say(`${O}'s Rattled!`); await boost(other(side), { spe: 1 }); }
    }
    if (a === 'Download' && o.hp > 0) {
      const up = o.st.def * MULT(o.boosts.def) < o.st.spd * MULT(o.boosts.spd) ? { atk: 1 } : { spa: 1 };
      await say(`${L}'s Download!`, cls); await boost(side, up);
    }
    if (a === 'Slow Start') { m.slow = 5; await say(`${L} can't get it going!`, cls); }
    if (a === 'Zero to Hero' && m.hero && !m.heroSaid) { m.heroSaid = true; await say(`${L} underwent a heroic transformation!`, cls); }
    if (a === 'Pressure') await say(`${L} is exerting its pressure!`, cls);
    if (TERRAIN_SETTERS[a] && terrain() !== TERRAIN_SETTERS[a]) await setTerrain(TERRAIN_SETTERS[a], `${L}'s ${a}! `, cls);
    if (a === 'Orichalcum Pulse' && (!G.battle.weather || G.battle.weather.type !== 'sun')) await setWeather('sun', `${L}'s Orichalcum Pulse! `, cls);
    await syncForm(side);
    if (a === 'Intrepid Sword') { await say(`${L}'s Intrepid Sword!`, cls); await boost(side, { atk: 1 }); }
    if (a === 'Dauntless Shield') { await say(`${L}'s Dauntless Shield!`, cls); await boost(side, { def: 1 }); }
    if (WEATHER_SETTERS[a] && (!G.battle.weather || G.battle.weather.type !== WEATHER_SETTERS[a])) await setWeather(WEATHER_SETTERS[a], `${L}'s ${a}! `, cls);
  }

  // Imposter / Transform: copy the foe's stats, types, moves (5 PP each), boosts and ability
  async function transformInto(side) {
    const m = act(side), o = act(other(side)), cls = side === 'b' ? 'foe' : '';
    m.base = { st: Object.assign({}, m.st), moves: m.moves.slice(), pp: Object.assign({}, m.pp) };
    m.st = Object.assign({}, o.st); m.types = o.types.slice(); m.moves = o.moves.slice();
    m.pp = Object.fromEntries(m.moves.map(n => [n, 5]));
    m.boosts = Object.assign({}, o.boosts); m.dispId = o.dispId || sprOf(o);
    if (abil(o) && !NO_COPY.includes(abil(o))) m.abil = abil(o);
    renderSprites();
    await say(`${label(side, m)} transformed into ${o.name}!`, cls);
    if (side === 'p') renderControls();
  }

  async function setWeather(type, prefix = '', cls = '') {
    G.battle.weather = { type, turns: 5 };
    FX.weather(type);
    if (type === 'snow') for (const s of ['p', 'b']) act(s).iceBroken = false;  // Ice Face reforms
    await say(`${prefix}${WEATHER_TEXT[type][0]}`, cls);
    for (const s of ['p', 'b']) await syncForm(s);
  }
  async function setTerrain(type, prefix = '', cls = '') {
    G.battle.terrain = { type, turns: 5 };
    await say(`${prefix}${TERRAIN_TEXT[type][0]}`, cls);
  }

  function setForm(m, base) {
    const s = base.map((v, i) => i === 0 ? Math.floor((2 * v + 52) * m.level / 100) + m.level + 10 : Math.floor((2 * v + 52) * m.level / 100) + 5);
    m.st = { atk: s[1], def: s[2], spa: s[3], spd: s[4], spe: s[5] };
    return s[0];
  }
  // HP-based form changes and Forecast; called after anything that changes HP or weather
  async function syncForm(side) {
    const m = act(side); if (!m || m.hp <= 0) return;
    const a = abil(m), L = label(side, m), cls = side === 'b' ? 'foe' : '', half = m.hp <= m.maxhp / 2;
    if (a === 'Schooling' && (m.hp > m.maxhp / 4) !== !!m.school) {
      m.school = !m.school; setForm(m, m.school ? FORMS.Schooling : DEX[m.name].stats);
      await say(m.school ? `${L} formed a school!` : `${L} stopped schooling!`, cls);
    }
    if (a === 'Shields Down' && half !== !!m.core) {
      m.core = half; setForm(m, half ? FORMS['Shields Down'] : DEX[m.name].stats);
      await say(half ? `${L}'s shell broke apart!` : `${L}'s shell reformed!`, cls);
    }
    if (a === 'Zen Mode' && half !== !!m.zen) {
      const galar = m.name === 'Darmanitan-Galar';
      m.zen = half; setForm(m, half ? FORMS[galar ? 'Zen Mode Galar' : 'Zen Mode'] : DEX[m.name].stats);
      m.types = half ? (galar ? ['Ice', 'Fire'] : ['Fire', 'Psychic']) : DEX[m.name].types.slice();
      await say(half ? `${L} entered Zen Mode!` : `${L} left Zen Mode!`, cls);
    }
    if (a === 'Power Construct' && half && !m.complete) {
      m.complete = true;
      const hp = setForm(m, FORMS['Power Construct']);
      m.hp += hp - m.maxhp; m.maxhp = hp;
      await say(`${L} transformed into its Complete Forme!`, cls);
    }
    if (a === 'Forecast') {
      const W = weather(), t = W === 'rain' ? 'Water' : W === 'sun' ? 'Fire' : W === 'snow' ? 'Ice' : 'Normal';
      if (m.types.length !== 1 || m.types[0] !== t) { m.types = [t]; await say(`${L} transformed into the ${t} type!`, cls); }
    }
  }

  async function weatherTick() {
    const B = G.battle; if (!B.weather) return;
    if (B.weather.type === 'sand' && weather() === 'sand') {
      for (const s of ['p', 'b']) {
        const m = act(s), a = abil(m);
        if (m.hp <= 0 || m.types.some(t => ['Rock', 'Ground', 'Steel'].includes(t)) || SAND_IMMUNE.includes(a) || m.v.invuln === 'under' || m.v.invuln === 'water') continue;
        await hurt(s, Math.floor(m.maxhp / 16), `${label(s, m)} is buffeted by the sandstorm!`);
      }
    }
    if (--B.weather.turns <= 0) { const t = B.weather.type; B.weather = null; FX.weather(null); await say(WEATHER_TEXT[t][1], 'sys'); }
  }
  async function terrainTick() {
    const B = G.battle; if (!B.terrain) return;
    if (B.terrain.type === 'grassy') {
      for (const s of ['p', 'b']) {
        const m = act(s);
        if (m.hp > 0 && m.hp < m.maxhp && grounded(m)) { m.hp = Math.min(m.maxhp, m.hp + Math.floor(m.maxhp / 16)); await say(`${label(s, m)} is healed by the grassy terrain.`); }
      }
    }
    if (--B.terrain.turns <= 0) { const t = B.terrain.type; B.terrain = null; await say(TERRAIN_TEXT[t][1], 'sys'); }
  }

  // Stat drops caused by the opponent: blocked by Mist, Clear Body etc., punished by Defiant/Competitive
  async function lowerByFoe(side, changes, srcSide) {
    const m = act(side), a = abil(m), L = label(side, m);
    if (m.hp <= 0) return;
    const drops = Object.values(changes).some(v => v < 0);
    if (drops && srcSide && srcSide !== side && sideOf(m) && sideOf(m).mist) { await say(`${L} is protected by the mist!`); return; }
    if (drops && NO_DROPS.includes(a)) { await say(`${L}'s ${a} prevents its stats from being lowered!`); return; }
    for (const [ab, k, nm] of [['Hyper Cutter', 'atk', 'Attack'], ['Big Pecks', 'def', 'Defense'], ['Keen Eye', 'acc', 'accuracy'], ["Mind's Eye", 'acc', 'accuracy'], ['Illuminate', 'acc', 'accuracy']]) {
      if (a === ab && changes[k] < 0) {
        changes = Object.assign({}, changes); delete changes[k];
        await say(`${L}'s ${ab} prevents its ${nm} from being lowered!`);
      }
    }
    await boost(side, changes);
    if (drops && a === 'Defiant' && m.hp > 0) { await say(`${L}'s Defiant!`); await boost(side, { atk: 2 }); }
    if (drops && a === 'Competitive' && m.hp > 0) { await say(`${L}'s Competitive!`); await boost(side, { spa: 2 }); }
  }

  async function absorbHit(side, ab) {
    const t = act(side), T = label(side, t), effect = ABSORB[ab][1];
    if (effect === 'heal') {
      if (t.hp < t.maxhp) { t.hp = Math.min(t.maxhp, t.hp + Math.floor(t.maxhp / 4)); await say(`${T}'s ${ab} restored its HP!`); }
      else await say(`${T}'s ${ab} made the move useless!`);
    } else if (effect === 'ff') {
      t.ff = true; await say(`${T}'s Flash Fire powered up its Fire-type moves!`);
    } else if (effect) {
      await say(`${T}'s ${ab}!`); await boost(side, effect);
    } else await say(`${T} avoided the attack with ${ab}!`);
  }

  async function hurt(side, amt, msg) {
    const m = act(side);
    if (m.hp <= 0) return;
    m.hp = Math.max(0, m.hp - Math.max(1, amt));
    await say(msg, side === 'b' ? 'foe' : '');
    if (m.hp <= 0) await faint(side);
  }
  async function heal(side, amt, msg) {
    const m = act(side);
    if (m.hp <= 0 || m.hp >= m.maxhp) return false;
    m.hp = Math.min(m.maxhp, m.hp + Math.max(1, amt));
    if (msg) await say(msg, side === 'b' ? 'foe' : '');
    return true;
  }
  async function faint(side) {
    const m = act(side);
    if (m.faintSaid) return;
    m.faintSaid = true;
    anim(side, 'faint');
    await say(`${label(side, m)} fainted!`, side === 'b' ? 'foe' : 'sys');
    for (const s2 of ['p', 'b']) {
      const x = act(s2);
      if (x.hp > 0 && abil(x) === 'Soul-Heart') { await say(`${label(s2, x)}'s Soul-Heart!`); await boost(s2, { spa: 1 }); }
    }
  }

  const STAT_NAMES = { atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed', acc: 'accuracy', eva: 'evasiveness' };
  async function boost(side, changes, copy = true) {
    const m = act(side), L = label(side, m), a = abil(m), gains = {};
    if (m.hp <= 0) return;
    for (let [k, v] of Object.entries(changes)) {
      if (a === 'Simple') v *= 2;
      if (a === 'Contrary') v = -v;
      if (!v) continue;
      const cur = m.boosts[k] || 0;
      if (v > 0 && cur >= 6) { await say(`${L}'s ${STAT_NAMES[k]} won't go any higher!`); continue; }
      if (v < 0 && cur <= -6) { await say(`${L}'s ${STAT_NAMES[k]} won't go any lower!`); continue; }
      m.boosts[k] = Math.max(-6, Math.min(6, cur + v));
      if (v > 0) gains[k] = v;
      FX.stat(side, v > 0);
      const n = Math.abs(v);
      const word = v > 0 ? (n === 1 ? 'rose' : n === 2 ? 'rose sharply' : 'rose drastically') : (n === 1 ? 'fell' : n === 2 ? 'harshly fell' : 'severely fell');
      await say(`${L}'s ${STAT_NAMES[k]} ${word}!`, side === 'b' ? 'foe' : '');
    }
    const o = act(other(side));
    if (copy && Object.keys(gains).length && o.hp > 0 && abil(o) === 'Opportunist') {
      await say(`${label(other(side), o)}'s Opportunist!`);
      await boost(other(side), gains, false);
    }
  }

  const STATUS_MSG = { brn: 'was burned!', par: 'is paralyzed! It may be unable to move!', psn: 'was poisoned!', tox: 'was badly poisoned!', slp: 'fell asleep!', frz: 'was frozen solid!' };
  // src = the side that caused it (for Synchronize / Corrosion / Safeguard), if it came from a move
  async function inflict(side, st, secondary, src) {
    const m = act(side);
    if (m.hp <= 0) return;
    const corrosion = src && abil(act(src)) === 'Corrosion';
    const guarded = src && src !== side && sideOf(m) && sideOf(m).safeguard && abil(act(src)) !== 'Infiltrator';
    if (m.status || statusImmune(m, st, corrosion) || guarded) { if (!secondary) await say(guarded ? `${label(side, m)} is protected by Safeguard!` : 'But it failed!'); return; }
    m.status = st;
    FX.status(side, st);
    if (st === 'slp') { m.slp = 2 + Math.floor(Math.random() * 3); if (abil(m) === 'Early Bird') m.slp = 1 + Math.ceil((m.slp - 1) / 2); }
    if (st === 'tox') m.tox = 1;
    await say(`${label(side, m)} ${STATUS_MSG[st]}`, side === 'b' ? 'foe' : '');
    if (src && src !== side && abil(m) === 'Synchronize' && ['brn', 'par', 'psn', 'tox'].includes(st) && act(src).hp > 0) {
      await say(`${label(side, m)}'s Synchronize!`);
      await inflict(src, st, false, null);
    }
  }
  // Confusion lasts 2–5 turns (1–4 confused turns)
  async function confuse(side, secondary, fatigue) {
    const m = act(side), L = label(side, m);
    if (m.hp <= 0) return;
    if (m.v.confusion) { if (!secondary && !fatigue) await say(`${L} is already confused!`); return; }
    const sd = sideOf(m);
    if (abil(m) === 'Own Tempo' || (grounded(m) && terrain() === 'misty') || (!fatigue && sd && sd.safeguard)) { if (!secondary && !fatigue) await say('But it failed!'); return; }
    m.v.confusion = 2 + Math.floor(Math.random() * 4);
    await say(fatigue ? `${L} became confused due to fatigue!` : `${L} became confused!`, side === 'b' ? 'foe' : '');
  }
  // Hitting itself in confusion: a typeless 40-power physical hit with its own stats
  function confusionDamage(u) {
    const A = Math.floor(stat(u, 'atk')), D = Math.max(1, Math.floor(stat(u, 'def')));
    const base = Math.floor(Math.floor(Math.floor(2 * u.level / 5 + 2) * 40 * A / D) / 50) + 2;
    return Math.max(1, Math.floor(base * (85 + Math.floor(Math.random() * 16)) / 100));
  }

  // ---------- Using a move ----------
  // Moves that still hit a target in the middle of Fly / Dig / Dive
  const INVULN_HITS = { air: ['Thunder', 'Hurricane', 'Sky Uppercut', 'Smack Down', 'Gust', 'Twister'], under: ['Earthquake', 'Magnitude', 'Fissure'], water: ['Surf', 'Whirlpool'], vanish: [] };
  const SELF_VOLS = ['substitute', 'endure', 'destinybond', 'focusenergy', 'aquaring', 'ingrain', 'charge', 'roost'];
  const targetsFoe = (m, u) => m.cat !== 'x' || !!(m.inflict || m.tgt || m.phaze || (m.vol && !SELF_VOLS.includes(m.vol) && !m.protect) || ['painsplit', 'psychup', 'transform', 'strengthsap', 'defog'].includes(m.special) || (m.special === 'curse' && u && u.types.includes('Ghost')));
  const CHARGE_TEXT = { air: 'flew up high!', under: 'burrowed its way under the ground!', water: 'hid underwater!', vanish: 'vanished instantly!' };
  function rollHits(m, a) {
    if (!Array.isArray(m.multi)) return m.multi;
    if (abil(a) === 'Skill Link') return m.multi[1];
    if (m.multi[0] === 2 && m.multi[1] === 5) { const r = Math.random(); return r < 0.35 ? 2 : r < 0.7 ? 3 : r < 0.85 ? 4 : 5; }
    return m.multi[0] + Math.floor(Math.random() * (m.multi[1] - m.multi[0] + 1));
  }
  function rollCrit(u, t, m) {
    const dA = defAbil(u, t);
    if (dA === 'Battle Armor' || dA === 'Shell Armor') return false;
    if (m.crit === 'always' || (abil(u) === 'Merciless' && (t.status === 'psn' || t.status === 'tox'))) return true;
    const stage = Math.min(3, (typeof m.crit === 'number' ? m.crit : 0) + (abil(u) === 'Super Luck' ? 1 : 0) + (u.v.focus ? 2 : 0));
    return Math.random() < [1 / 24, 1 / 8, 1 / 2, 1][stage];
  }
  // Accuracy with stages, abilities and weather; returns true if it hits
  function hitsTarget(u, t, m) {
    if (!m.acc || t.v.glaive) return true;
    const aA = abil(u), tA = defAbil(u, t), W = weather();
    if (aA === 'No Guard' || abil(t) === 'No Guard') return true;
    if (m.ohko) {
      const acc = (m.ohko === 'Ice' && !u.types.includes('Ice') ? 20 : 30) + u.level - t.level;
      return Math.random() * 100 < acc;
    }
    if (m.inflict === 'tox' && u.types.includes('Poison')) return true;
    let acc = m.acc;
    if ((m.name === 'Thunder' || m.name === 'Hurricane') && W === 'rain') return true;
    if ((m.name === 'Thunder' || m.name === 'Hurricane') && W === 'sun') acc = 50;
    if (m.name === 'Blizzard' && W === 'snow') return true;
    const accStage = tA === 'Unaware' ? 0 : u.boosts.acc;
    let evaStage = aA === 'Unaware' || m.ignoreEva ? 0 : t.boosts.eva;
    if (aA === 'Keen Eye' || aA === "Mind's Eye" || aA === 'Illuminate') evaStage = Math.min(0, evaStage);
    acc *= ACC_MULT(Math.max(-6, Math.min(6, accStage - evaStage)));
    if (aA === 'Compound Eyes') acc *= 1.3;
    if (aA === 'Hustle' && m.cat === 'p') acc *= 0.8;
    if (aA === 'Victory Star') acc *= 1.1;
    if (m.cat === 'x' && tA === 'Wonder Skin') acc = Math.min(acc, 50);
    if ((tA === 'Sand Veil' && W === 'sand') || (tA === 'Snow Cloak' && W === 'snow')) acc *= 0.8;
    if (tA === 'Tangled Feet' && t.v.confusion) acc *= 0.5;
    return Math.random() * 100 < acc;
  }

  async function useMove(s, name, ctx = {}) {
    const B = G.battle, u = act(s), o = other(s);
    let t = act(o);
    const m = MOVES[name] || MOVES.Struggle;
    const U = label(s, u), cls = s === 'b' ? 'foe' : '';
    const forced = !!ctx.forced && !ctx.called;
    const fail = () => { u.v.lastFailed = true; delete u.v.lock; delete u.v.charging; delete u.v.invuln; };
    u.v.glaive = false;
    if (!m.stall) u.v.stall = 0;
    if (u.v.dbond && name !== 'Destiny Bond') delete u.v.dbond;

    // ---- Can it act? ----
    if (!ctx.called) {
      if (u.v.flinch) {
        u.v.flinch = false; await say(`${U} flinched and couldn't move!`, cls);
        if (abil(u) === 'Steadfast') { await say(`${U}'s Steadfast!`, cls); await boost(s, { spe: 1 }); }
        return fail();
      }
      if (u.status === 'frz') {
        if (Math.random() < 0.2 || m.thaw) { u.status = null; await say(`${U} thawed out!`, cls); }
        else { await say(`${U} is frozen solid!`, cls); return fail(); }
      }
      if (u.status === 'slp') {
        u.slp--;
        if (u.slp > 0) { await say(`${U} is fast asleep.`, cls); if (!m.sleepUsable) return fail(); }
        else { u.status = null; await say(`${U} woke up!`, cls); }
      }
      if (abil(u) === 'Truant') {
        if (u.loaf) { u.loaf = false; await say(`${U} is loafing around!`, cls); return fail(); }
        u.loaf = true;
      }
      if (u.v.disable && u.v.disable.move === name && !forced) { await say(`${U}'s ${name} is disabled!`, cls); return fail(); }
      if (u.v.taunt && m.cat === 'x' && !forced) { await say(`${U} can't use ${name} after the taunt!`, cls); return fail(); }
      if (u.v.confusion) {
        if (--u.v.confusion <= 0) { delete u.v.confusion; await say(`${U} snapped out of its confusion!`, cls); }
        else {
          await say(`${U} is confused!`, cls);
          if (Math.random() < 1 / 3) { await hurt(s, confusionDamage(u), 'It hurt itself in its confusion!'); return fail(); }
        }
      }
      if (u.status === 'par' && Math.random() < 0.25) { await say(`${U} is fully paralyzed!`, cls); return fail(); }
      if (m.special === 'focuspunch' && u.v.fpHit) { await say(`${U} lost its focus and couldn't move!`, cls); return fail(); }
      // PP (Pressure doubles it); forced turns of Outrage / charge moves use none
      if (name !== 'Struggle' && !forced) {
        const cost = abil(t) === 'Pressure' && t.hp > 0 && targetsFoe(m, u) ? 2 : 1;
        u.pp[name] = Math.max(0, (u.pp[name] !== undefined ? u.pp[name] : maxPP(name)) - cost);
      }
      u.v.lastMove = name;
    }

    // ---- Two-turn moves: the charging turn ----
    if (m.charge && !forced) {
      if (skipsCharge(u, m)) {
        if (m.special === 'electroshot') { await say(`${U} absorbed electricity!`, cls); await boost(s, { spa: 1 }); }
      } else {
        u.v.charging = name;
        if (m.invuln) u.v.invuln = m.invuln;
        await say(m.invuln ? `${U} ${CHARGE_TEXT[m.invuln]}` : `${U} is charging up ${name}!`, cls);
        if (m.special === 'meteorbeam' || m.special === 'electroshot') await boost(s, { spa: 1 });
        if (m.special === 'skullbash') await boost(s, { def: 1 });
        return;
      }
    }
    if (u.v.charging === name) { delete u.v.charging; delete u.v.invuln; }

    await say(`${U} used ${name}!`, cls);
    const aA = abil(u), type = moveType(u, m), sp = m.special;
    if (aA === 'Stance Change' && (m.cat !== 'x') !== !!u.blade) {
      u.blade = m.cat !== 'x'; setForm(u, u.blade ? FORMS.blade : FORMS.shield);
      await say(`${U} changed to ${u.blade ? 'Blade' : 'Shield'} Forme!`, cls);
    }
    if ((aA === 'Protean' || aA === 'Libero') && !u.prot && name !== 'Struggle' && (u.types.length !== 1 || u.types[0] !== type)) {
      u.types = [type]; u.prot = true;
      await say(`${U}'s ${aA}: it became the ${type} type!`, cls);
    }
    const failMsg = async (msg = 'But it failed!') => { await say(msg); fail(); };
    const done = async r => {
      if (m.selfKO === 'always' && u.hp > 0) { u.hp = 0; G.battle.selfKO = s; await faint(s); }
      return r;
    };

    // ---- Move-specific conditions ----
    if ((sp === 'fakeout' || sp === 'firstimpression') && !isFresh(u)) return done(await failMsg());
    if (sp === 'suckerpunch' || sp === 'thunderclap') { const f = B.acts && B.acts[o]; if (B.acted[o] || !f || f.kind !== 'move' || MOVES[f.move].cat === 'x') return done(await failMsg()); }
    if (sp === 'upperhand') { const f = B.acts && B.acts[o]; if (B.acted[o] || !f || f.kind !== 'move' || MOVES[f.move].cat === 'x' || prio(t, f.move) <= 0) return done(await failMsg()); }
    if (sp === 'dreameater' && t.status !== 'slp' && abil(t) !== 'Comatose') return done(await failMsg());
    if (sp === 'snore' && u.status !== 'slp') return done(await failMsg());
    if (['counter', 'mirrorcoat', 'metalburst', 'comeuppance', 'endeavor'].includes(sp) && !fixedDamage(u, t, m)) return done(await failMsg());
    if ((m.selfKO === 'always' || sp === 'mistyexplosion') && activeHas('Damp')) { await say(`Damp prevents ${name}!`); fail(); return; }
    if (sp === 'auroraveil' && weather() !== 'snow') return done(await failMsg());
    if (sp === 'sleeptalk') {
      if (u.status !== 'slp') return done(await failMsg());
      const opts = u.moves.filter(n => n !== name && MOVES[n] && !MOVES[n].charge && !MOVES[n].unsupported && !['sleeptalk', 'focuspunch'].includes(MOVES[n].special));
      if (!opts.length) return done(await failMsg());
      return useMove(s, pickRand(opts), { called: true, movedFirst: ctx.movedFirst, movedLast: ctx.movedLast });
    }

    // ---- Moves that target the foe: Protect, semi-invulnerability, priority blockers ----
    const hitsFoe = targetsFoe(m, u);
    if (hitsFoe && t.hp <= 0) return done(await failMsg('But there was no target...'));
    if (hitsFoe) {
      const T = label(o, t), dA = defAbil(u, t);
      if (PRIO_BLOCK.includes(dA) && prio(u, name) > 0) { await say(`${T}'s ${dA} blocks the move!`); fail(); return done(); }
      if (terrain() === 'psychic' && grounded(t) && prio(u, name) > 0 && m.cat !== 'x') { await say(`${T} is protected by the Psychic Terrain!`); fail(); return done(); }
      if (t.v.protect && m.protectable && !m.breaksProtect && !(aA === 'Unseen Fist' && m.contact)) {
        await say(`${T} protected itself!`);
        await protectPunish(s, o, m);
        if (m.crash && aA !== 'Magic Guard') await hurt(s, Math.floor(u.maxhp / 2), `${U} kept going and crashed!`);
        fail(); return done();
      }
      if (m.breaksProtect && t.v.protect) { t.v.protect = null; await say(`${T}'s protection was broken!`); }
      if (t.v.invuln && aA !== 'No Guard' && abil(t) !== 'No Guard' && !(INVULN_HITS[t.v.invuln] || []).includes(name)) {
        await say(`${T} avoided the attack!`); fail(); return done();
      }
      if (!hitsTarget(u, t, m)) {
        await say(m.cat === 'x' ? `${T} avoided the attack!` : `${U}'s attack missed!`, cls);
        if (m.crash && aA !== 'Magic Guard') await hurt(s, Math.floor(u.maxhp / 2), `${U} kept going and crashed!`);
        fail(); return done();
      }
    } else if (m.cat === 'x' && m.acc && !hitsTarget(u, u, m)) { await say(`${U}'s move missed!`, cls); fail(); return done(); }

    if (m.cat === 'x') await statusMove(s, name, m, ctx);
    else await attackMove(s, name, m, ctx);
    return done();
  }

  // Spiky Shield, King's Shield, Baneful Bunker... punish contact
  async function protectPunish(s, o, m) {
    const t = act(o), u = act(s), kind = t.v.protect, U = label(s, u);
    if (!m.contact || abil(u) === 'Long Reach') return;
    if (kind === 'spikyshield' && abil(u) !== 'Magic Guard') await hurt(s, Math.floor(u.maxhp / 8), `${U} was hurt by the spiky shield!`);
    if (kind === 'kingsshield') await lowerByFoe(s, { atk: -1 }, o);
    if (kind === 'banefulbunker') await inflict(s, 'psn', true, o);
    if (kind === 'silktrap') await lowerByFoe(s, { spe: -1 }, o);
    if (kind === 'obstruct') await lowerByFoe(s, { def: -2 }, o);
    if (kind === 'burningbulwark') await inflict(s, 'brn', true, o);
  }

  // Forced switch for side `side` (Roar, Whirlwind, Dragon Tail...)
  async function dragOut(side) {
    const B = G.battle, t = act(side), bench = benchAlive(side);
    if (!bench.length || t.hp <= 0) return false;
    if (abil(t) === 'Suction Cups') { await say(`${label(side, t)} anchors itself with Suction Cups!`); return false; }
    if (t.v.ingrain) { await say(`${label(side, t)} anchored itself with its roots!`); return false; }
    await switchIn(side, pickRand(bench), true, { dragged: true });
    B.acted[side] = true;
    return true;
  }
  // The user switches out mid-turn (U-turn, Volt Switch, Baton Pass, Shed Tail...)
  async function pivotOut(s, opts = {}) {
    if (!benchAlive(s).length || act(s).hp <= 0) return;
    const idx = s === 'p' ? await pickSwitch('pivot') : bossNext(true);
    if (s === 'b' && idx >= 0) G.battle.bPivoted = G.battle.turn;   // Hard won't switch straight back next turn
    if (idx < 0) return;
    await switchIn(s, idx, true, opts);
  }

  async function statusMove(s, name, m, ctx) {
    const B = G.battle, u = act(s), o = other(s), t = act(o), sp = m.special;
    const U = label(s, u), T = label(o, t), cls = s === 'b' ? 'foe' : '';
    const why = statusBlock(u, t, name);
    if (why === 'gold') { await say(`${T}'s Good as Gold blocks the move!`); u.v.lastFailed = true; return; }
    if (why === 'absorb') { await absorbHit(o, defAbil(u, t)); u.v.lastFailed = true; return; }
    if (why === 'sub') { await say('But it failed!'); u.v.lastFailed = true; return; }
    if (why === 'dark' || why === 'powder' || why === 'type') { await say(`It doesn't affect ${T}...`); u.v.lastFailed = true; return; }
    if (why === 'bounce') { await say(`${T} bounced the ${name} back!`); await statusEffects(o, s, m, name); return; }
    await FX.move(s, m, m.type);
    const ok = await statusEffects(s, o, m, name);
    u.v.lastFailed = ok === false;
  }

  // Applies a status move's effects from side s onto side o; returns false if it failed
  async function statusEffects(s, o, m, name) {
    const B = G.battle, u = act(s), t = act(o), sp = m.special;
    const U = label(s, u), T = label(o, t), cls = s === 'b' ? 'foe' : '', W = weather();
    const failMsg = async (msg = 'But it failed!') => { await say(msg); return false; };
    const mySide = B.side[s], theirSide = B.side[o];

    // ---- Handlers ----
    switch (sp) {
      case 'curse':
        if (u.types.includes('Ghost')) {
          if (t.v.curse) return failMsg();
          await hurt(s, Math.floor(u.maxhp / 2), `${U} cut its own HP and laid a curse on ${T}!`);
          t.v.curse = true; return true;
        }
        await boost(s, { atk: 1, def: 1, spe: -1 }); return true;
      case 'bellydrum':
        if (u.hp <= Math.floor(u.maxhp / 2) || u.boosts.atk >= 6) return failMsg();
        u.hp -= Math.floor(u.maxhp / 2); u.boosts.atk = 6; FX.stat(s, true);
        await say(`${U} cut its own HP and maximized its Attack!`, cls); return true;
      case 'filletaway': case 'clangoroussoul': {
        const cost = Math.floor(u.maxhp / (sp === 'filletaway' ? 2 : 3));
        if (u.hp <= cost) return failMsg();
        u.hp -= cost;
        await say(`${U} sacrificed some HP!`, cls);
        await boost(s, sp === 'filletaway' ? { atk: 2, spa: 2, spe: 2 } : { atk: 1, def: 1, spa: 1, spd: 1, spe: 1 }); return true;
      }
      case 'noretreat':
        if (u.v.noretreat) return failMsg();
        u.v.noretreat = true; await boost(s, { atk: 1, def: 1, spa: 1, spd: 1, spe: 1 }); return true;
      case 'painsplit': {
        const avg = Math.floor((u.hp + t.hp) / 2);
        u.hp = Math.min(u.maxhp, avg); t.hp = Math.min(t.maxhp, avg);
        await say('The battlers shared their pain!'); return true;
      }
      case 'haze':
        u.boosts = freshBoosts(); t.boosts = freshBoosts();
        await say('All stat changes were eliminated!'); return true;
      case 'psychup':
        u.boosts = Object.assign({}, t.boosts);
        await say(`${U} copied ${T}'s stat changes!`, cls); return true;
      case 'healbell': case 'aromatherapy': {
        const list = s === 'p' ? B.p : B.b;
        list.forEach(x => { if (x.hp > 0) x.status = null; });
        await say(`A soothing aroma wafted through ${team(s)}!`, cls); return true;
      }
      case 'strengthsap': {
        if (t.boosts.atk <= -6) return failMsg();
        const amt = Math.floor(stat(t, 'atk'));
        await lowerByFoe(o, { atk: -1 }, s);
        await heal(s, amt, `${U} restored HP.`); return true;
      }
      case 'rest':
        if (u.hp >= u.maxhp || u.status === 'slp' || statusImmune(u, 'slp')) return failMsg();
        u.status = 'slp'; u.slp = 3; u.hp = u.maxhp;
        await say(`${U} slept and became healthy!`, cls); return true;
      case 'transform':
        if (u.base || t.v.sub) return failMsg();
        await transformInto(s); return true;
      case 'defog':
        for (const sd of [mySide, theirSide]) for (const k of ['stealthrock', 'spikes', 'toxicspikes', 'stickyweb']) delete sd[k];
        for (const k of ['reflect', 'lightscreen', 'auroraveil', 'safeguard', 'mist']) delete theirSide[k];
        await say('The hazards and barriers were blown away!');
        if (!t.v.sub) await lowerByFoe(o, { eva: -1 }, s); return true;
      case 'courtchange':
        [B.side.p, B.side.b] = [B.side.b, B.side.p];
        await say(`${U} swapped the battle effects affecting each side!`, cls); return true;
      case 'tidyup':
        for (const sd of [mySide, theirSide]) for (const k of ['stealthrock', 'spikes', 'toxicspikes', 'stickyweb']) delete sd[k];
        delete u.v.sub; delete t.v.sub;
        await say('Tidying up complete!'); await boost(s, { atk: 1, spe: 1 }); return true;
      case 'perishsong':
        for (const x of [s, o]) { const mon = act(x); if (mon.hp > 0 && !mon.v.perish && abil(mon) !== 'Soundproof') mon.v.perish = 4; }
        await say('All Pokémon that hear the song will faint in three turns!'); return true;
      case 'wish':
        if (mySide.wish) return failMsg();
        mySide.wish = { turns: 2, hp: Math.floor(u.maxhp / 2), from: u.name };
        await say(`${U} made a wish!`, cls); return true;
      case 'healingwish': case 'lunardance':
        if (!benchAlive(s).length) return failMsg();
        mySide.healingwish = true; u.hp = 0; B.selfKO = s; await faint(s); return true;
      case 'synthesis': case 'morningsun': case 'moonlight': {
        const fr = W === 'sun' ? 2 / 3 : W ? 1 / 4 : 1 / 2;
        if (!(await heal(s, Math.round(u.maxhp * fr), `${U} restored HP.`))) return failMsg(`${U}'s HP is full!`);
        return true;
      }
      case 'shoreup':
        if (!(await heal(s, Math.round(u.maxhp * (W === 'sand' ? 2 / 3 : 1 / 2)), `${U} restored HP.`))) return failMsg(`${U}'s HP is full!`);
        return true;
      case 'roost':
        if (!(await heal(s, Math.floor(u.maxhp / 2), `${U} landed and restored HP.`))) return failMsg(`${U}'s HP is full!`);
        if (u.types.includes('Flying')) { u.v.roost = u.types.slice(); u.types = u.types.length > 1 ? u.types.filter(x => x !== 'Flying') : ['Normal']; }
        return true;
      case 'charge':
        u.charged = true; await say(`${U} began charging power!`, cls); await boost(s, { spd: 1 }); return true;
      case 'shedtail':
        if (u.hp <= Math.floor(u.maxhp / 2) || !benchAlive(s).length) return failMsg();
        u.hp -= Math.ceil(u.maxhp / 2);
        await say(`${U} shed its tail to create a decoy!`, cls);
        await pivotOut(s, { shed: Math.floor(u.maxhp / 4) }); return true;
      case 'geomancy':
        await boost(s, { spa: 2, spd: 2, spe: 2 }); return true;
    }

    // ---- Generic effects (in game order) ----
    let did = false;
    if (m.heal) {
      if (!(await heal(s, Math.floor(u.maxhp * m.heal), `${U} restored HP.`))) return failMsg(`${U}'s HP is full!`);
      did = true;
    }
    if (m.stall) {
      // Protect / Endure: success chance falls to 1/3 each consecutive use
      if (Math.random() >= 1 / Math.pow(3, u.v.stall || 0) || !B.acts || B.acted[o] === undefined) { u.v.stall = 0; return failMsg(); }
      if (B.acted[o]) { u.v.stall = 0; return failMsg(); }  // moving last: nothing left to protect from
      u.v.stall = (u.v.stall || 0) + 1;
      if (m.protect) { u.v.protect = m.protect; await say(`${U} protected itself!`, cls); }
      else { u.v.endure = true; await say(`${U} braced itself!`, cls); }
      did = true;
    }
    if (m.vol && !m.protect && m.vol !== 'endure') {
      const v = m.vol;
      if (v === 'substitute') {
        if (u.v.sub) return failMsg(`${U} already has a substitute!`);
        const cost = Math.floor(u.maxhp / 4);
        if (u.hp <= cost) return failMsg('But it does not have enough HP left to make a substitute!');
        u.hp -= cost; u.v.sub = cost;
        await say(`${U} put in a substitute!`, cls);
      } else if (v === 'focusenergy') { if (u.v.focus) return failMsg(); u.v.focus = true; await say(`${U} is getting pumped!`, cls); }
      else if (v === 'aquaring') { if (u.v.aquaring) return failMsg(); u.v.aquaring = true; await say(`${U} surrounded itself with a veil of water!`, cls); }
      else if (v === 'ingrain') { if (u.v.ingrain) return failMsg(); u.v.ingrain = true; await say(`${U} planted its roots!`, cls); }
      else if (v === 'destinybond') { if (u.v.dbondLast === B.turn - 1) return failMsg(); u.v.dbond = true; u.v.dbondLast = B.turn; await say(`${U} is hoping to take its attacker down with it!`, cls); }
      else if (v === 'confusion') await confuse(o, false);
      else if (v === 'leechseed') {
        if (t.types.includes('Grass')) return failMsg(`It doesn't affect ${T}...`);
        if (t.v.seed) return failMsg(`${T} is already seeded!`);
        t.v.seed = true; await say(`${T} was seeded!`);
      } else if (v === 'taunt' || v === 'encore' || v === 'disable') {
        if ((VOL_BLOCKERS[v] || []).includes(defAbil(u, t))) return failMsg(`${T}'s ${defAbil(u, t)} prevents it!`);
        if (v === 'taunt') { if (t.v.taunt) return failMsg(); t.v.taunt = 3; await say(`${T} fell for the taunt!`); }
        if (v === 'encore') {
          const last = t.v.lastMove;
          if (!last || t.v.encore || !t.moves.includes(last) || ['Encore', 'Struggle', 'Transform', 'Sleep Talk'].includes(last) || (t.pp[last] || 0) <= 0) return failMsg();
          t.v.encore = { move: last, turns: 3 }; await say(`${T} must do an encore!`);
        }
        if (v === 'disable') {
          const last = t.v.lastMove;
          if (!last || t.v.disable || last === 'Struggle') return failMsg();
          t.v.disable = { move: last, turns: 4 }; await say(`${T}'s ${last} was disabled!`);
        }
      } else if (v === 'yawn') {
        if (t.status || t.v.yawn || statusImmune(t, 'slp') || (theirSide && theirSide.safeguard)) return failMsg();
        t.v.yawn = 2; await say(`${U} made ${T} drowsy!`, cls);
      }
      did = true;
    }
    if (m.self && !m.heal) { await boost(s, m.self); did = true; }
    if (m.tgt) { await lowerByFoe(o, m.tgt, s); did = true; }
    if (m.inflict) {
      if (t.status) return failMsg(`${T} is already ${t.status === 'slp' ? 'asleep' : 'statused'}!`);
      await inflict(o, m.inflict, false, s); did = true;
    }
    if (m.side) {
      const sd = m.sideFoe ? theirSide : mySide, k = m.side, who = m.sideFoe ? team(o) : team(s);
      const cap = { spikes: 3, toxicspikes: 2 };
      if (cap[k]) {
        if ((sd[k] || 0) >= cap[k]) return failMsg();
        sd[k] = (sd[k] || 0) + 1;
        await say(k === 'spikes' ? `Spikes were scattered around ${who}'s feet!` : `Poison spikes were scattered around ${who}'s feet!`);
      } else if (['stealthrock', 'stickyweb'].includes(k)) {
        if (sd[k]) return failMsg();
        sd[k] = true;
        await say(k === 'stealthrock' ? `Pointed stones float in the air around ${who}!` : `A sticky web spreads out on the ground around ${who}!`);
      } else {
        if (sd[k]) return failMsg();
        sd[k] = k === 'tailwind' ? 4 : 5;
        const SIDE_MSG = { reflect: w => `Reflect made ${w} stronger against physical moves!`, lightscreen: w => `Light Screen made ${w} stronger against special moves!`, auroraveil: w => `Aurora Veil made ${w} stronger against physical and special moves!`, tailwind: w => `The Tailwind blew from behind ${w}!`, safeguard: w => `${w[0].toUpperCase() + w.slice(1)} cloaked itself in a mystical veil!`, mist: w => `${w[0].toUpperCase() + w.slice(1)} became shrouded in mist!` };
        await say(SIDE_MSG[k](who));
      }
      did = true;
    }
    if (m.field === 'trickroom') {
      if (B.field.trickroom) { delete B.field.trickroom; await say('The twisted dimensions returned to normal!'); }
      else { B.field.trickroom = 5; await say(`${U} twisted the dimensions!`, cls); }
      did = true;
    }
    if (m.weather) {
      if (B.weather && B.weather.type === m.weather) return failMsg();
      await setWeather(m.weather); did = true;
    }
    if (m.terrain) {
      if (terrain() === m.terrain) return failMsg();
      await setTerrain(m.terrain); did = true;
    }
    if (m.phaze) { if (!(await dragOut(o))) return failMsg(); did = true; }
    if (m.selfKO === 'ifHit' && u.hp > 0) { u.hp = 0; B.selfKO = s; await faint(s); }
    if (m.pivot && u.hp > 0) { await pivotOut(s, m.pivot === 'pass' ? { pass: true } : {}); did = true; }
    return did;
  }

  async function attackMove(s, name, m, ctx) {
    const B = G.battle, u = act(s), o = other(s), t = act(o), sp = m.special;
    const U = label(s, u), T = label(o, t), cls = s === 'b' ? 'foe' : '';
    const aA = abil(u), dA = defAbil(u, t), type = moveType(u, m);
    if (sp === 'futuresight' || sp === 'doomdesire') {
      if (B.future[o]) { await say('But it failed!'); u.v.lastFailed = true; return; }
      B.future[o] = { turns: 3, move: name, user: JSON.parse(JSON.stringify(u)) };
      await say(sp === 'futuresight' ? `${U} foresaw an attack!` : `${U} chose Doom Desire as its destiny!`, cls); u.v.lastFailed = false; return;
    }
    const absorber = absorbedBy(u, t, type);
    if (absorber) { await absorbHit(o, absorber); u.v.lastFailed = true; return; }
    const blocker = blockedBy(u, t, m);
    if (blocker === 'Wind Rider') { await say(`${T}'s Wind Rider!`); await boost(o, { atk: 1 }); u.v.lastFailed = true; return; }
    if (blocker) { await say(`${T}'s ${blocker} blocks the move!`); u.v.lastFailed = true; return; }
    const e = eff(u, m, t);
    if (e === 0 || (m.ohko && (t.level > u.level || (m.ohko === 'Ice' && t.types.includes('Ice'))))) { await say(`It doesn't affect ${T}...`); u.v.lastFailed = true; delete u.v.lock; return; }
    if (m.ohko && dA === 'Sturdy') { await say(`${T} endured the hit with Sturdy!`); u.v.lastFailed = true; return; }
    if (['brickbreak', 'psychicfangs', 'ragingbull'].includes(sp)) {
      const sd = B.side[o];
      if (sd.reflect || sd.lightscreen || sd.auroraveil) { delete sd.reflect; delete sd.lightscreen; delete sd.auroraveil; await say('It shattered the barrier!'); }
    }
    await FX.move(s, m, type);
    const subbed = () => t.v.sub && !m.sound && !m.bypassSub && aA !== 'Infiltrator';
    const hitSub = subbed();

    if (!hitSub && dA === 'Disguise' && !t.busted && !m.fixed && !FIXED.includes(sp)) {
      t.busted = true;
      t.hp = Math.max(0, t.hp - Math.floor(t.maxhp / 8));
      anim(o, 'hit');
      await say(`${T}'s disguise served it as a decoy!`);
      await say(`${T}'s disguise was busted!`);
      if (t.hp <= 0) await faint(o);
      u.v.lastFailed = false; return;
    }
    if (!hitSub && dA === 'Ice Face' && m.cat === 'p' && !t.iceBroken) {
      t.iceBroken = true; anim(o, 'hit');
      await say(`${T}'s Ice Face took the hit and broke!`);
      u.v.lastFailed = false; return;
    }

    // ---- Hits ----
    const sayEffect = async () => {
      if (m.fixed || m.ohko || FIXED.includes(sp)) return;
      if (e > 1) await say("It's super effective!");
      else if (e < 1) await say("It's not very effective...");
    };
    const hits = m.multi ? rollHits(m, u) : 1;
    const fickle = sp === 'ficklebeam' && Math.random() < 0.3;
    if (fickle) await say(`${U} is going all out for this attack!`, cls);
    const hpBefore = t.hp;
    let total = 0, landed = 0, lastCrit = false, endured = null, brokeSub = false;
    for (let h = 1; h <= hits; h++) {
      if (t.hp <= 0 || u.hp <= 0) break;
      if (h > 1 && m.multiacc && !hitsTarget(u, t, m)) break;
      const crit = rollCrit(u, t, m);
      let dmg = calc(u, t, m, (85 + Math.floor(Math.random() * 16)) / 100, crit, { hit: h, movedFirst: ctx.movedFirst, movedLast: ctx.movedLast, pursuit: ctx.pursuit, fickle });
      if (m.ohko) dmg = t.hp;
      if (subbed()) {
        dmg = Math.min(dmg, t.v.sub);
        t.v.sub -= dmg;
        if (crit) await say('A critical hit!');
        if (h === 1) await sayEffect();
        await say(`The substitute took damage for ${T}!`);
        if (t.v.sub <= 0) { delete t.v.sub; brokeSub = true; await say(`${T}'s substitute faded!`); }
      } else {
        dmg = Math.min(dmg, t.hp);
        if (dmg >= t.hp && t.hp === t.maxhp && dA === 'Sturdy') { dmg = t.hp - 1; endured = 'Sturdy'; }
        else if (dmg >= t.hp && t.v.endure) { dmg = t.hp - 1; endured = 'endure'; }
        t.hp -= dmg;
        t.v.hitBy = { dmg, cat: m.cat, side: s };
        if (m.cat !== 'x') t.timesHit = (t.timesHit || 0) + 1;
        t.v.fpHit = true;
        anim(o, 'hit'); refresh();
        await sleep(300 / (save.settings.speed || 1));
        if (crit) await say('A critical hit!');
        if (h === 1) await sayEffect();
        if (crit && dA === 'Anger Point' && t.hp > 0) { t.boosts.atk = 6; await say(`${T}'s Anger Point maxed its Attack!`); }
        if (m.contact && aA !== 'Long Reach' && u.hp > 0) await contactEffects(s, o, m);
        if (t.hp > 0) await onHitReactions(s, o, m, type, hpBefore);
      }
      total += dmg; landed++; lastCrit = crit;
    }
    if (m.ohko && landed && t.hp <= 0) await say("It's a one-hit KO!");
    if (hits > 1) await say(`The Pokémon was hit ${landed} time${landed === 1 ? '' : 's'}!`);
    if (endured === 'Sturdy') await say(`${T} endured the hit with Sturdy!`);
    if (endured === 'endure') await say(`${T} endured the hit!`);
    if (u.charged && type === 'Electric') u.charged = false;

    // ---- After the hits ----
    if (m.drain && u.hp > 0 && total > 0) {
      if (abil(t) === 'Liquid Ooze') await hurt(s, Math.max(1, Math.floor(total * m.drain)), `${U} sucked up the liquid ooze!`);
      else await heal(s, Math.max(1, Math.floor(total * m.drain)), `${T} had its energy drained!`);
    }
    if (t.hp <= 0) {
      await faint(o);
      if (KO_BOOST[aA] && u.hp > 0) { await say(`${U}'s ${aA}!`, cls); await boost(s, KO_BOOST[aA]); }
      if (aA === 'Beast Boost' && u.hp > 0) { await say(`${U}'s Beast Boost!`, cls); await boost(s, { [topStat(u)]: 1 }); }
      if (abil(t) === 'Aftermath' && m.contact && u.hp > 0 && aA !== 'Magic Guard') await hurt(s, Math.floor(u.maxhp / 4), `${U} was caught in the Aftermath!`);
      if (abil(t) === 'Innards Out' && u.hp > 0) await hurt(s, hpBefore, `${U} was hurt by ${T}'s Innards Out!`);
      if (aA === 'Battle Bond' && u.hp > 0 && !u.bonded) { u.bonded = true; await say(`${U}'s Battle Bond!`, cls); await boost(s, { atk: 1, spa: 1, spe: 1 }); }
      if (t.v.dbond && u.hp > 0) { await say(`${T} took its attacker down with it!`); u.hp = 0; B.selfKO = o; await faint(s); }
    } else if (t.hp > 0) {
      const crossed = hpBefore > t.maxhp / 2 && t.hp <= t.maxhp / 2;
      if (dA === 'Color Change' && landed && (t.types.length !== 1 || t.types[0] !== type)) { t.types = [type]; await say(`${T}'s Color Change made it the ${type} type!`); }
      if (crossed && HALF_TRIGGERS.includes(dA)) {
        if (dA === 'Berserk') { await say(`${T}'s Berserk!`); await boost(o, { spa: 1 }); }
        if (dA === 'Anger Shell') { await say(`${T}'s Anger Shell!`); await boost(o, { atk: 1, spa: 1, spe: 1, def: -1, spd: -1 }); }
        if (dA === 'Wimp Out' || dA === 'Emergency Exit') t.wimp = true;
      }
    }
    if (u.hp > 0 && total > 0 && aA !== 'Rock Head' && aA !== 'Magic Guard' && m.recoil) await hurt(s, Math.max(1, Math.round(total * m.recoil)), `${U} is damaged by the recoil!`);
    if (u.hp > 0 && sp === 'struggle') await hurt(s, Math.max(1, Math.round(u.maxhp / 4)), `${U} is damaged by the recoil!`);
    if (u.hp > 0 && ['steelbeam', 'mindblown', 'chloroblast'].includes(sp) && aA !== 'Magic Guard') await hurt(s, Math.ceil(u.maxhp / 2), `${U} cut its own HP to power up its move!`);
    if (sp === 'finalgambit' && u.hp > 0) { u.hp = 0; B.selfKO = s; await faint(s); }
    if (m.self && u.hp > 0 && landed) await boost(s, m.self);

    // ---- Secondary effects ----
    const onTarget = t.hp > 0 && !hitSub && !brokeSub && landed > 0;
    if (aA !== 'Sheer Force' && landed) {
      for (const sec of m.secs || []) {
        if (Math.random() * 100 >= sec.ch * (aA === 'Serene Grace' ? 2 : 1)) continue;
        if (sec.self && u.hp > 0) await boost(s, sec.self);
        if (!onTarget || defAbil(u, t) === 'Shield Dust') continue;
        if (sec.st) await inflict(o, sec.st, true, s);
        if (sec.tgt) await lowerByFoe(o, sec.tgt, s);
        if (sec.vol === 'flinch' && ctx.movedFirst && abil(t) !== 'Inner Focus') t.v.flinch = true;
        if (sec.vol === 'confusion') await confuse(o, true);
        if (sec.vol === 'saltcure' && !t.v.saltcure) { t.v.saltcure = true; await say(`${T} is being salt cured!`); }
      }
      if (m.name === 'Tri Attack' && onTarget && Math.random() * 100 < 20 * (aA === 'Serene Grace' ? 2 : 1) && defAbil(u, t) !== 'Shield Dust') await inflict(o, pickRand(['brn', 'par', 'frz']), true, s);
      if (aA === 'Stench' && onTarget && ctx.movedFirst && !(m.secs || []).some(x => x.vol === 'flinch') && Math.random() < 0.1 && abil(t) !== 'Inner Focus') t.v.flinch = true;
    }
    if (aA === 'Toxic Chain' && onTarget && Math.random() < 0.3) await inflict(o, 'tox', true, s);
    if (m.thawsTarget && t.status === 'frz' && t.hp > 0) { t.status = null; await say(`${T} thawed out!`); }
    if (onTarget && m.vol === 'partiallytrapped' && !t.v.partial) { t.v.partial = { turns: 4 + (Math.random() < 0.5 ? 1 : 0), name }; await say(`${T} was trapped by ${name}!`); }
    if (onTarget && m.vol === 'smackdown' && !grounded(t)) { t.v.smackdown = true; delete t.v.invuln; await say(`${T} fell straight down!`); }
    if (onTarget && ['spiritshackle', 'anchorshot', 'thousandwaves'].includes(sp) && !t.v.trapped) { t.v.trapped = true; await say(`${T} can no longer escape!`); }
    if (onTarget && sp === 'jawlock') { t.v.trapped = true; u.v.trapped = true; await say('Neither Pokémon can run away!'); }
    if (sp === 'clearsmog' && onTarget) { t.boosts = freshBoosts(); await say(`${T}'s stat changes were removed!`); }
    if (['rapidspin', 'mortalspin'].includes(sp) && u.hp > 0 && landed) {
      const sd = B.side[s]; let cleared = false;
      for (const k of ['stealthrock', 'spikes', 'toxicspikes', 'stickyweb']) if (sd[k]) { delete sd[k]; cleared = true; }
      if (u.v.partial || u.v.seed) { delete u.v.partial; delete u.v.seed; cleared = true; }
      if (cleared) await say(`${U} blew away the hazards!`, cls);
    }
    if (sp === 'icespinner' && landed && B.terrain) { const tt = B.terrain.type; B.terrain = null; await say(TERRAIN_TEXT[tt][1]); }

    // ---- Lingering states on the user ----
    if (m.recharge && landed && u.hp > 0) u.v.recharge = true;
    if (m.glaive && u.hp > 0) u.v.glaive = true;
    if (m.lock && u.hp > 0) {
      if (!ctx.forced) u.v.lock = { move: name, left: 1 + (Math.random() < 0.5 ? 1 : 0) };
      else if (u.v.lock && --u.v.lock.left <= 0) { delete u.v.lock; await confuse(s, true, true); }
    }
    u.v.lastFailed = !landed;
    if (m.phaze && onTarget && t.hp > 0) await dragOut(o);
    if (m.pivot && u.hp > 0 && landed) await pivotOut(s);
  }

  // Abilities on the defender that react to contact
  async function contactEffects(s, o, m) {
    const u = act(s), t = act(o), aA = abil(u), dA = defAbil(u, t), U = label(s, u), T = label(o, t);
    if (t.hp > 0 && aA === 'Poison Touch' && Math.random() < 0.3) await inflict(o, 'psn', true, s);
    if (['Mummy', 'Lingering Aroma'].includes(dA) && aA !== dA && !NO_COPY.includes(aA)) { u.abil = dA; await say(`${U}'s ability became ${dA}!`); }
    if (dA === 'Wandering Spirit' && aA && !NO_COPY.includes(aA)) { t.abil = aA; u.abil = 'Wandering Spirit'; await say(`${U} swapped abilities with ${T}!`); }
    if ((dA === 'Rough Skin' || dA === 'Iron Barbs') && aA !== 'Magic Guard') await hurt(s, Math.floor(u.maxhp / 8), `${U} was hurt by ${T}'s ${dA}!`);
    if (u.hp > 0 && dA === 'Static' && Math.random() < 0.3) await inflict(s, 'par', true, o);
    if (u.hp > 0 && dA === 'Flame Body' && Math.random() < 0.3) await inflict(s, 'brn', true, o);
    if (u.hp > 0 && dA === 'Poison Point' && Math.random() < 0.3) await inflict(s, 'psn', true, o);
    if (u.hp > 0 && dA === 'Effect Spore' && !u.types.includes('Grass') && aA !== 'Overcoat' && Math.random() < 0.3) await inflict(s, pickRand(['psn', 'par', 'slp']), true, o);
    if (u.hp > 0 && (dA === 'Gooey' || dA === 'Tangling Hair')) { await say(`${T}'s ${dA}!`); await lowerByFoe(s, { spe: -1 }, o); }
    if (u.hp > 0 && dA === 'Cursed Body' && !u.v.disable && u.v.lastMove && Math.random() < 0.3) { u.v.disable = { move: u.v.lastMove, turns: 4 }; await say(`${U}'s ${u.v.lastMove} was disabled by ${T}'s Cursed Body!`); }
    if (u.hp > 0 && dA === 'Perish Body' && !u.v.perish) { u.v.perish = 4; if (!t.v.perish) t.v.perish = 4; await say('Both Pokémon will faint in three turns!'); }
  }
  // Abilities that react to being hit (each hit of a multi-hit move)
  async function onHitReactions(s, o, m, type, hpBefore) {
    const B = G.battle, u = act(s), t = act(o), dA = defAbil(u, t), T = label(o, t);
    if (dA === 'Justified' && type === 'Dark') { await say(`${T}'s Justified!`); await boost(o, { atk: 1 }); }
    if (dA === 'Stamina') { await say(`${T}'s Stamina!`); await boost(o, { def: 1 }); }
    if (dA === 'Weak Armor' && m.cat === 'p') { await say(`${T}'s Weak Armor!`); await boost(o, { def: -1, spe: 2 }); }
    if (dA === 'Rattled' && ['Bug', 'Dark', 'Ghost'].includes(type)) { await say(`${T}'s Rattled!`); await boost(o, { spe: 1 }); }
    if (dA === 'Water Compaction' && type === 'Water') { await say(`${T}'s Water Compaction!`); await boost(o, { def: 2 }); }
    if (dA === 'Steam Engine' && (type === 'Fire' || type === 'Water')) { await say(`${T}'s Steam Engine!`); await boost(o, { spe: 6 }); }
    if (dA === 'Electromorphosis' || (dA === 'Wind Power' && m.wind)) { t.charged = true; await say(`${T} became charged with power!`); }
    if (dA === 'Cotton Down' && u.hp > 0) { await say(`${T}'s Cotton Down!`); await lowerByFoe(s, { spe: -1 }, o); }
    if (dA === 'Sand Spit' && (!B.weather || B.weather.type !== 'sand')) await setWeather('sand', `${T}'s Sand Spit! `);
    if (dA === 'Seed Sower' && terrain() !== 'grassy') await setTerrain('grassy', `${T}'s Seed Sower! `);
  }

  // ---------- End of turn ----------
  async function residual(s, m) {
    const L = label(s, m), a = abil(m), W = weather(), guard = a === 'Magic Guard', o = act(other(s)), cls = s === 'b' ? 'foe' : '';
    if (m.hp <= 0) return;
    if (m.v.aquaring) await heal(s, Math.floor(m.maxhp / 16), `A veil of water restored ${L}'s HP!`);
    if (m.v.ingrain) await heal(s, Math.floor(m.maxhp / 16), `${L} absorbed nutrients with its roots!`);
    if (m.v.seed && !guard && m.hp > 0) {
      const amt = Math.max(1, Math.floor(m.maxhp / 8));
      await hurt(s, amt, `${L}'s health is sapped by Leech Seed!`);
      if (o.hp > 0) { if (a === 'Liquid Ooze') await hurt(other(s), amt, `${label(other(s), o)} sucked up the liquid ooze!`); else await heal(other(s), amt); }
    }
    if (m.hp > 0 && a === 'Poison Heal' && (m.status === 'psn' || m.status === 'tox')) {
      await heal(s, Math.floor(m.maxhp / 8), `${L} restored HP with Poison Heal.`);
    } else if (m.hp > 0 && !guard) {
      if (m.status === 'brn') await hurt(s, Math.floor(m.maxhp / 16), `${L} is hurt by its burn!`);
      else if (m.status === 'psn') await hurt(s, Math.floor(m.maxhp / 8), `${L} is hurt by poison!`);
      else if (m.status === 'tox') { await hurt(s, Math.floor(m.maxhp * m.tox / 16), `${L} is hurt by poison!`); m.tox = Math.min(15, m.tox + 1); }
    }
    if (m.hp > 0 && m.v.curse && !guard) await hurt(s, Math.floor(m.maxhp / 4), `${L} is afflicted by the curse!`);
    if (m.hp > 0 && m.v.partial) {
      if (--m.v.partial.turns <= 0) { await say(`${L} was freed from ${m.v.partial.name}!`, cls); delete m.v.partial; }
      else if (!guard) await hurt(s, Math.floor(m.maxhp / 8), `${L} is hurt by ${m.v.partial.name}!`);
    }
    if (m.hp > 0 && m.v.saltcure && !guard) await hurt(s, Math.floor(m.maxhp / (m.types.includes('Water') || m.types.includes('Steel') ? 4 : 8)), `${L} is hurt by Salt Cure!`);
    if (m.hp > 0 && m.status && ((a === 'Shed Skin' && Math.random() < 0.33) || (a === 'Hydration' && W === 'rain'))) {
      m.status = null; await say(`${L}'s ${a} cured its status!`);
    }
    if (m.hp > 0 && ((a === 'Rain Dish' && W === 'rain') || (a === 'Ice Body' && W === 'snow'))) await heal(s, Math.floor(m.maxhp / 16), `${L} restored HP with ${a}.`);
    if (m.hp > 0 && a === 'Bad Dreams' && o.hp > 0 && o.status === 'slp') await hurt(other(s), Math.floor(o.maxhp / 8), `${label(other(s), o)} is tormented by Bad Dreams!`);
    if (m.hp > 0 && a === 'Slow Start' && m.slow > 0 && --m.slow === 0) await say(`${L} finally got its act together!`);
    if (m.hp > 0 && a === 'Moody') {
      const keys = ['atk', 'def', 'spa', 'spd', 'spe'], up = pickRand(keys.filter(k => m.boosts[k] < 6)), down = pickRand(keys.filter(k => k !== up && m.boosts[k] > -6));
      await say(`${L}'s Moody!`);
      await boost(s, Object.assign(up ? { [up]: 2 } : {}, down ? { [down]: -1 } : {}));
    }
    if (m.hp > 0 && a === 'Solar Power' && W === 'sun') await hurt(s, Math.floor(m.maxhp / 8), `${L} is hurt by Solar Power!`);
    if (a === 'Speed Boost' && m.hp > 0 && m.boosts.spe < 6 && m.v.enteredTurn !== G.battle.turn) { await say(`${L}'s Speed Boost!`, cls); await boost(s, { spe: 1 }); }
  }

  async function endOfTurn() {
    const B = G.battle;
    await weatherTick();
    // Future Sight / Doom Desire land
    for (const s of ['p', 'b']) {
      const f = B.future[s];
      if (!f || --f.turns > 0) continue;
      delete B.future[s];
      const t = act(s);
      if (t.hp <= 0) continue;
      await say(`${label(s, t)} took the ${f.move} attack!`);
      const mv = MOVES[f.move], e = typeEff(mv.type, t);
      if (!e) { await say(`It doesn't affect ${label(s, t)}...`); continue; }
      const dmg = Math.min(t.hp, calc(f.user, t, mv, (85 + Math.floor(Math.random() * 16)) / 100, false));
      t.hp -= dmg; anim(s, 'hit'); refresh();
      if (t.hp <= 0) await faint(s);
    }
    // Wish
    for (const s of ['p', 'b']) {
      const w = B.side[s].wish;
      if (!w || --w.turns > 0) continue;
      delete B.side[s].wish;
      if (act(s).hp > 0) await heal(s, w.hp, `${w.from}'s wish came true!`);
    }
    const order = ['p', 'b'].sort((x, y) => faster(act(x), act(y)) ? -1 : 1);
    for (const s of order) await residual(s, act(s));
    // Volatile countdowns
    for (const s of order) {
      const m = act(s), v = m.v, L = label(s, m), cls = s === 'b' ? 'foe' : '';
      v.flinch = false; v.protect = null; v.endure = false;
      if (v.roost) { m.types = v.roost; delete v.roost; }
      if (m.hp <= 0) continue;
      if (v.taunt && --v.taunt <= 0) { delete v.taunt; await say(`${L}'s taunt wore off!`, cls); }
      if (v.encore && --v.encore.turns <= 0) { delete v.encore; await say(`${L}'s encore ended!`, cls); }
      if (v.disable && --v.disable.turns <= 0) { delete v.disable; await say(`${L} is no longer disabled!`, cls); }
      if (v.yawn && --v.yawn <= 0) { delete v.yawn; if (!m.status) await inflict(s, 'slp', true, null); }
      if (v.perish) {
        v.perish--;
        await say(`${L}'s perish count fell to ${v.perish}.`, cls);
        if (v.perish <= 0) { m.hp = 0; await faint(s); }
      }
    }
    // Side conditions and Trick Room wear off
    const SIDE_END = { reflect: 'Reflect', lightscreen: 'Light Screen', auroraveil: 'Aurora Veil', tailwind: 'Tailwind', safeguard: 'Safeguard', mist: 'Mist' };
    for (const s of ['p', 'b']) {
      const sd = B.side[s];
      for (const k of Object.keys(SIDE_END)) if (sd[k] && --sd[k] <= 0) { delete sd[k]; await say(`${s === 'p' ? 'Your team' : "The foe's team"}'s ${SIDE_END[k]} wore off!`, 'sys'); }
    }
    if (B.field.trickroom && --B.field.trickroom <= 0) { delete B.field.trickroom; await say('The twisted dimensions returned to normal!', 'sys'); }
    await terrainTick();
    for (const s of ['p', 'b']) await syncForm(s);
  }

  // Inside Discord: send daily battle progress for the live card in the channel (see discord.js).
  // Only when something visible changes (start, a faint, the result), to keep the edits few.
  function discordReport() {
    if (!window.dcDiscordReport || !G || G.mode !== 'daily' || !G.battle) return;
    const B = G.battle, boss = bossOf(G), r = G.phase === 'done' ? G.result : null;
    const state = {
      day: G.key, num: G.num, boss: boss.name, sprite: boss.sprite || boss.key, diff: diffLabel(G.diff), turn: B.turn,
      me: B.p.map(m => m.hp > 0), foe: B.b.map(m => m.hp > 0), done: !!r, won: !!(r && r.won),
      shiny: r && r.shiny && r.shiny.caught ? r.shiny.name : null
    };
    const sig = JSON.stringify([state.me, state.foe, state.done]);
    if (sig === discordReport.last) return;
    discordReport.last = sig;
    window.dcDiscordReport(state);
  }

  async function finish(won) {
    const B = G.battle, boss = bossOf(G);
    await say(won ? `You defeated ${boss.name}!` : `You are out of usable Pokémon…`, 'sys');
    G.phase = 'done';
    G.result = {
      won, turns: B.turn,
      left: B.p.filter(m => m.hp > 0).length,
      ko: B.b.filter(m => m.hp <= 0).length,
      alive: B.p.map(m => m.hp > 0),
      bossAlive: B.b.map(m => m.hp > 0)
    };
    if (G.mode === 'daily' && G.shiny && G.picks.includes(G.shiny)) {
      G.result.shiny = { name: G.shiny, caught: won };
      if (won) {
        save.shinies[G.shiny] = { date: G.key, num: G.num, boss: boss.name, diff: G.diff };
        await say(`✨ Shiny ${G.shiny} was added to your Shiny Dex!`, 'sys');
      }
    }
    persistRun();
    discordReport();
    await sleep(900);
    render();
  }

  // ---------- Rendering ----------
  function render() {
    if (!G) return;
    if (G.phase === 'intro') renderIntro();
    else if (G.phase === 'draft') renderDraft();
    else if (G.phase === 'battle') renderBattle();
    else renderResult();
    window.scrollTo({ top: 0 });
  }

  function practiceBanner() {
    return G.mode === 'practice'
      ? `<div class="banner"><span>🎯 Practice battle: it doesn't count toward your stats.</span><button class="btn ghost" id="back-daily" style="padding:6px 12px">Back to daily</button></div>`
      : '';
  }
  function bindPracticeBanner() {
    const b = $('#back-daily'); if (b) b.onclick = () => { G = save.days[TODAY] || newDaily(); render(); };
  }
  const abilLine = name => ABILITIES[name] ? `<div class="abil-line" title="${esc(ABILITY_INFO[ABILITIES[name]])}">${esc(ABILITIES[name])}</div>` : '';
  function miniCard(name, dead, shiny) {
    const sp = DEX[name];
    return `<div class="mini ${dead ? 'dead' : ''} ${shiny ? 'shiny' : ''}"><img class="sprite" src="${front(sprOf(sp), shiny)}" alt="${esc(name)}" loading="lazy">
      <div class="nm">${shiny ? '✨ ' : ''}${esc(name)}</div><div class="types">${sp.types.map(typeBadge).join('')}</div>${abilLine(name)}</div>`;
  }

  function renderIntro() {
    const boss = bossOf(G);
    app.innerHTML = `${practiceBanner()}
      <section class="boss-hero" style="--boss:${boss.color}">
        <img class="trainer" src="${trainerSrc(boss)}" alt="${esc(boss.name)}" onerror="dcTrainerFallback(this)">
        <div>
          <div class="day">${G.mode === 'daily' ? `DAILY #${G.num} · ${G.key}` : 'PRACTICE'}</div>
          <h2>${esc(boss.name)}</h2>
          <div class="where">${esc(boss.title)} · ${esc(boss.place)}, ${esc(boss.region)}</div>
          <blockquote>“${esc(boss.quote)}”</blockquote>
        </div>
      </section>
      <div class="section-title">${esc(boss.name.toUpperCase())}'S TEAM</div>
      <div class="team-strip">${boss.team.map(n => miniCard(n)).join('')}</div>
      <div class="section-title">DIFFICULTY ${G.mode === 'daily' ? '<span class="muted">(locked once you start)</span>' : ''}</div>
      <div class="diff-pick">${Object.entries(DIFFS).map(([k, d]) =>
        `<button class="diff ${G.diff === k ? 'on' : ''}" data-diff="${k}"><b>${d.label}</b><span>${d.desc}</span></button>`).join('')}</div>
      <div class="cta">
        <button class="btn big" id="go-draft">Draft your team →</button>
        ${G.mode === 'daily' ? '<button class="btn ghost big" id="go-practice">Practice</button>' : ''}
      </div>`;
    app.querySelectorAll('[data-diff]').forEach(b => b.onclick = () => { G.diff = b.dataset.diff; persistRun(); renderIntro(); });
    $('#go-draft').onclick = () => { G.phase = 'draft'; persistRun(); render(); };
    const pr = $('#go-practice'); if (pr) pr.onclick = openPracticeMenu;
    bindPracticeBanner();
  }

  // One-line fairness summary for the draft screen (doesn't reveal which Pokémon are the counters)
  function poolCheck() {
    const boss = bossOf(G), pool = G.pool, res = withoutBattle(() => judgePool(pool, boss.team));
    const ok = Math.min(...res.beaten) >= 2;
    const msg = ok
      ? `Every one of ${esc(boss.name)}'s Pokémon has at least 2 counters in this pool.`
      : `Tough pool: some of ${esc(boss.name)}'s Pokémon have fewer than 2 counters here.`;
    return `<div class="pool-check ${ok ? '' : 'warn'}">${ok ? '✅' : '⚠️'} ${msg}</div>`;
  }

  function renderDraft() {
    const boss = bossOf(G);
    const stat = (v, l) => `<div><small>${l}</small>${v}</div>`;
    app.innerHTML = `${practiceBanner()}
      <h2>Draft 6 of ${G.shiny ? 10 : 9}</h2>
      <p class="muted" style="margin-top:0">Pick order is your party order. Your first pick leads.${G.mode === 'daily' ? ' Every player gets the same nine today.' : ''}</p>
      ${poolCheck()}
      <div class="draft-layout">
        <div class="pool">${(G.shiny ? [...G.pool, G.shiny] : G.pool).map(n => {
          const sp = DEX[n], i = G.picks.indexOf(n), s = sp.stats, sh = isShiny(n);
          return `<button class="pick ${i >= 0 ? 'on' : ''} ${sh ? 'shiny' : ''}" data-pick="${esc(n)}">
            ${i >= 0 ? `<span class="order">${i + 1}</span>` : ''}
            ${sh ? '<div class="shiny-ribbon">✨ SHINY · win with it on your team to add it to your Shiny Dex</div>' : ''}
            <div class="head"><img class="sprite" src="${front(sprOf(sp), sh)}" alt="">
              <div><div class="nm">${esc(n)}</div><div class="types">${sp.types.map(typeBadge).join('')}</div>${abilLine(n)}</div></div>
            <div class="stats">${stat(s[0], 'HP')}${stat(s[1], 'ATK')}${stat(s[2], 'DEF')}${stat(s[3], 'SPA')}${stat(s[4], 'SPD')}${stat(s[5], 'SPE')}</div>
            <div class="movelist">${movesFor(n, G.diff).map(m => `<span style="border-color:${TYPE_COLORS[MOVES[m].type]}">${esc(m)}</span>`).join('')}</div>
          </button>`;
        }).join('')}</div>
        <aside class="side-panel card">
          <div class="section-title" style="margin-top:0">YOUR TEAM</div>
          ${[0, 1, 2, 3, 4, 5].map(i => {
            const n = G.picks[i];
            return n ? `<div class="slot"><img class="sprite" src="${front(sprOf(DEX[n]), isShiny(n))}" alt=""><b>${i + 1}. ${isShiny(n) ? '✨ ' : ''}${esc(n)}</b></div>`
              : `<div class="slot empty">Slot ${i + 1}</div>`;
          }).join('')}
          <button class="btn" id="go-battle" style="width:100%;margin-top:6px" ${G.picks.length === 6 ? '' : 'disabled'}>Battle ${esc(boss.name)}!</button>
          <button class="btn ghost" id="go-back" style="width:100%;margin-top:10px">← Back</button>
          <div class="section-title">FOE · ${diffLabel(G.diff).toUpperCase()}</div>
          <div class="foe-list">${boss.team.map(n => `<div class="slot"><img class="sprite" src="${front(sprOf(DEX[n]))}" alt="">
            <span>${esc(n)}<br>${DEX[n].types.map(typeBadge).join(' ')}${abilLine(n)}</span></div>`).join('')}</div>
        </aside>
      </div>`;
    app.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
      const n = b.dataset.pick, i = G.picks.indexOf(n);
      if (i >= 0) G.picks.splice(i, 1); else if (G.picks.length < 6) G.picks.push(n);
      persistRun(); renderDraft();
    });
    $('#go-back').onclick = () => { G.phase = 'intro'; persistRun(); render(); };
    $('#go-battle').onclick = startBattle;
    bindPracticeBanner();
  }

  async function startBattle() {
    const boss = bossOf(G), lvl = DIFFS[G.diff].lvl;
    G.battle = { p: G.picks.map(n => Object.assign(makeMon(n, 100, G.diff), { shiny: isShiny(n) })), b: boss.team.map(n => makeMon(n, lvl, G.diff, G.diff === 'hard')), pa: 0, ba: 0, turn: 0, log: [], need: null, side: { p: {}, b: {} }, field: {}, future: {} };
    if (G.diff === 'hard') G.battle.ba = bossNext();
    act('p').v.enteredTurn = 0; act('b').v.enteredTurn = 0;
    G.phase = 'battle';
    persistRun();
    render();
    busy = true; renderControls();
    await say(`${boss.name} would like to battle!`, 'foe');
    await say(`${boss.name} sent out ${act('b').name}!`, 'foe');
    await say(goText(act('p')));
    if (act('p').shiny) FX.shiny('p');
    const first = speed(act('p')) > speed(act('b')) ? ['p', 'b'] : ['b', 'p'];
    for (const s of first) await onEntry(s);
    busy = false; persistRun(); renderControls(); discordReport();
  }

  function renderBattle() {
    const boss = bossOf(G);
    ensureBattle(G.battle);
    app.innerHTML = `${practiceBanner()}
      <div class="battle">
        <div class="arena">
          <div class="fx-weather"></div>
          <div class="trainer-tag"><img src="${trainerSrc(boss)}" alt="" onerror="dcTrainerFallback(this)">${esc(boss.name)} · ${diffLabel(G.diff)}</div>
          <div class="balls foe-balls" id="foe-balls"></div>
          <div class="weather-tag" id="weather" hidden></div>
          <div class="hpbox foe-box" id="foe-box"></div>
          <img class="mon-img foe-img" id="foe-img" alt="">
          <img class="mon-img me-img" id="me-img" alt="">
          <div class="hpbox me-box" id="me-box"></div>
          <div class="side-strip foe-strip" id="foe-strip"></div>
          <div class="side-strip me-strip" id="me-strip"></div>
          <div class="fx-layer"></div>
        </div>
        <div class="log" id="log">${G.battle.log.map(([m, c]) => `<p class="${c}">${esc(m)}</p>`).join('')}</div>
        <div class="controls card" id="controls"></div>
      </div>`;
    $('#log').scrollTop = 1e6;
    FX.weather(G.battle.weather ? G.battle.weather.type : null);
    renderSprites();
    refresh();
    renderControls();
    bindPracticeBanner();
  }

  function renderSprites() {
    const fi = $('#foe-img'), mi = $('#me-img'); if (!fi) return;
    const f = act('b'), m = act('p');
    fi.className = 'mon-img foe-img sprite' + (f.hp <= 0 ? ' faint' : '');
    fi.src = front(f.dispId || sprOf(f)); fi.alt = f.name;
    mi.className = 'mon-img me-img sprite' + (m.hp <= 0 ? ' faint' : '');
    mi.dataset.id = m.dispId || sprOf(m);
    mi.dataset.shiny = m.shiny && !m.dispId ? '1' : '';
    mi.onerror = () => window.dcBackFallback(mi);
    mi.src = back(m.dispId || sprOf(m), m.shiny && !m.dispId); mi.alt = m.name;
  }

  const hpColor = f => f > 0.5 ? 'var(--good)' : f > 0.2 ? 'var(--warn)' : 'var(--bad)';
  const statusTag = m => m.status ? `<span class="status-tag st-${m.status}">${m.status.toUpperCase()}</span>` : '';
  const abilTag = m => abil(m) ? `<span class="abil" title="${esc(ABILITY_INFO[abil(m)] || '')}">${esc(abil(m))}</span>` : '';
  const boostText = m => Object.entries(m.boosts).filter(([, v]) => v).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${STAT_NAMES[k]}`).join(' · ');
  // Small tags for volatile states (confusion, Substitute, Taunt...)
  function volTags(m) {
    const v = m.v || {}, t = [];
    if (v.confusion) t.push('Confused');
    if (v.sub) t.push('Substitute');
    if (v.seed) t.push('Seeded');
    if (v.taunt) t.push('Taunted');
    if (v.encore) t.push('Encore');
    if (v.disable) t.push(`${v.disable.move} disabled`);
    if (v.yawn) t.push('Drowsy');
    if (v.perish) t.push(`Perish ${v.perish - 1}`);
    if (v.curse) t.push('Cursed');
    if (v.partial) t.push(v.partial.name);
    if (v.trapped) t.push("Can't escape");
    if (v.saltcure) t.push('Salt Cure');
    if (v.aquaring) t.push('Aqua Ring');
    if (v.ingrain) t.push('Ingrain');
    if (v.focus) t.push('Pumped');
    if (v.recharge) t.push('Recharging');
    if (v.charging) t.push(`Charging ${v.charging}`);
    if (v.lock) t.push(`Locked: ${v.lock.move}`);
    if (v.smackdown) t.push('Grounded');
    return t.length ? `<div class="vols">${t.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : '';
  }
  const SIDE_LABELS = { stealthrock: 'Stealth Rock', spikes: 'Spikes', toxicspikes: 'Toxic Spikes', stickyweb: 'Sticky Web', reflect: 'Reflect', lightscreen: 'Light Screen', auroraveil: 'Aurora Veil', tailwind: 'Tailwind', safeguard: 'Safeguard', mist: 'Mist', wish: 'Wish' };
  const TIMED_SIDES = ['reflect', 'lightscreen', 'auroraveil', 'tailwind', 'safeguard', 'mist'];
  function sideText(s) {
    const B = G.battle, sd = B.side[s] || {};
    return Object.keys(SIDE_LABELS).filter(k => sd[k]).map(k => {
      const v = sd[k], layers = (k === 'spikes' || k === 'toxicspikes') && v > 1 ? ` ×${v}` : '';
      return `<span>${SIDE_LABELS[k]}${layers}${TIMED_SIDES.includes(k) ? ` · ${v}` : ''}</span>`;
    }).join('') + (B.future && B.future[s] ? `<span>${esc(B.future[s].move)} incoming</span>` : '');
  }

  function refresh() {
    const fb = $('#foe-box'); if (!fb || !G.battle) return;
    const f = act('b'), m = act('p');
    const ff = f.hp / f.maxhp, mf = m.hp / m.maxhp;
    fb.innerHTML = `<div class="nm"><span>${esc(f.name)} ${statusTag(f)}</span><span class="lv">${f.trained ? '<span class="trained-tag" title="Hard bosses have competitively trained stats">TRAINED</span> ' : ''}Lv${f.level}</span></div>
      <div class="hpbar"><i style="width:${ff * 100}%;background:${hpColor(ff)}"></i></div>
      <div class="num">${abilTag(f)}${Math.ceil(ff * 100)}%</div><div class="boosts">${boostText(f)}</div>${volTags(f)}`;
    $('#me-box').innerHTML = `<div class="nm"><span>${m.shiny ? '✨ ' : ''}${esc(m.name)} ${statusTag(m)}</span><span class="lv">Lv${m.level}</span></div>
      <div class="hpbar"><i style="width:${mf * 100}%;background:${hpColor(mf)}"></i></div>
      <div class="num">${abilTag(m)}${m.hp} / ${m.maxhp}</div><div class="boosts">${boostText(m)}</div>${volTags(m)}`;
    $('#foe-balls').innerHTML = G.battle.b.map(x => `<i class="${x.hp <= 0 ? 'out' : ''}"></i>`).join('');
    const w = G.battle.weather, tr = G.battle.terrain, wt = $('#weather');
    const room = G.battle.field && G.battle.field.trickroom;
    wt.hidden = !w && !tr && !room;
    wt.textContent = [w && `${WEATHER_TEXT[w.type][2]} · ${w.turns}`, tr && `${TERRAIN_TEXT[tr.type][2]} · ${tr.turns}`, room && `Trick Room · ${room}`].filter(Boolean).join('   ');
    $('#foe-strip').innerHTML = sideText('b');
    $('#me-strip').innerHTML = sideText('p');
  }

  function effLabel(user, m, target) {
    if (m.cat === 'x' || G.diff === 'hard') return '';
    if (absorbedBy(user, target, moveType(user, m))) return '<span class="eff">ABSORBED</span>';
    const e = eff(user, m, target);
    if (e === 0) return '<span class="eff">NO EFFECT</span>';
    if (e > 1) return `<span class="eff">SUPER ×${e}</span>`;
    if (e < 1) return `<span class="eff">RESIST ×${e}</span>`;
    return '';
  }

  function moveInfo(m, me, foe) {
    if (m.cat === 'x') return esc(m.desc || 'Status');
    const hits = m.multi ? (Array.isArray(m.multi) ? ` ×${m.multi[0]}–${m.multi[1]}` : ` ×${m.multi}`) : '';
    const bp = m.ohko ? 'OHKO' : m.fixed || FIXED.includes(m.special) ? 'Fixed dmg' : `${movePower(me, foe, m)} BP${hits}`;
    return `${m.cat === 'p' ? 'Physical' : 'Special'} · ${bp} · ${m.acc ? m.acc + '%' : '—'}${m.prio > 0 ? ' · Priority' : ''}`;
  }

  function renderControls() {
    const c = $('#controls'); if (!c || !G.battle) return;
    const B = G.battle, me = act('p'), foe = act('b');
    ensureBattle(B);
    const need = B.need, forced = !!need, fa = forcedAction(me);
    const trap = forced || canSwitch('p') ? '' : trappedBy('p') ? `trapped by the foe's ${trappedBy('p')}` : fa ? `${me.name} can't switch right now` : `${me.name} can't escape`;
    const partyHtml = B.p.map((m, i) => {
      const f = m.hp / m.maxhp, isActive = i === B.pa;
      const disabled = (busy && !forced) || isActive || m.hp <= 0 || !!trap;
      return `<button class="pmon ${isActive ? 'active' : ''}" data-sw="${i}" ${disabled ? 'disabled' : ''}>
        <img class="sprite" src="${front(sprOf(m), m.shiny)}" alt="">
        <div class="info"><div class="nm">${m.shiny ? '✨ ' : ''}${esc(m.name)} ${statusTag(m)}</div>
          <div class="hpbar"><i style="width:${f * 100}%;background:${hpColor(f)}"></i></div>
          <div class="sub">${m.hp}/${m.maxhp} · ${esc(abil(m) || 'No ability')}${isActive ? ' · in battle' : ''}</div></div></button>`;
    }).join('');
    const switchHead = `<div class="section-title">SWITCH${trap ? ` <span class="muted">· ${esc(trap)}</span>` : ''}</div>`;

    if (forced) {
      const why = need === 'retreat' ? `${esc(me.name)} retreated.` : need === 'pivot' ? `${esc(me.name)} is switching out.` : `${esc(me.name)} fainted.`;
      c.innerHTML = `<div class="ctl-head"><span class="prompt">${why} Choose your next Pokémon.</span></div><div class="party">${partyHtml}</div>`;
    } else if (fa && !busy) {
      // Recharging, charging a two-turn move, or locked into Outrage: the only option is to continue
      const what = fa.kind === 'recharge' ? `${esc(me.name)} must recharge.` : me.v.lock ? `${esc(me.name)} is locked into ${esc(fa.move)}.` : `${esc(me.name)} is ready to unleash ${esc(fa.move)}.`;
      c.innerHTML = `<div class="ctl-head"><span class="prompt">${what}</span><span class="muted small">Turn ${B.turn + 1}</span></div>
        <div class="moves"><button class="move continue" id="continue"><b>Continue</b><small>${fa.kind === 'recharge' ? 'Skip this turn' : esc(fa.move)}</small></button></div>
        ${switchHead}<div class="party">${partyHtml}</div>`;
      $('#continue').onclick = () => runTurn(fa);
    } else {
      const usable = usableMoves(me), struggling = usable[0] === 'Struggle';
      c.innerHTML = `<div class="ctl-head"><span class="prompt">${busy ? '…' : struggling ? `${esc(me.name)} has no moves left!` : `What will ${esc(me.name)} do?`}</span>
          <span class="muted small">Turn ${B.turn + 1}</span></div>
        <div class="moves">${(struggling ? ['Struggle'] : me.moves).map(n => {
          const m = MOVES[n], ok = usable.includes(n);
          const pp = n === 'Struggle' ? '' : ` · PP ${me.pp[n] !== undefined ? me.pp[n] : maxPP(n)}/${maxPP(n)}`;
          return `<button class="move" data-mv="${esc(n)}" style="background:${TYPE_COLORS[m.type]}" ${busy || !ok ? 'disabled' : ''}>
            ${effLabel(me, m, foe)}<b>${esc(n)}</b><small>${m.type} · ${moveInfo(m, me, foe)}${pp}</small></button>`;
        }).join('')}</div>
        ${switchHead}<div class="party">${partyHtml}</div>`;
      c.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => runTurn({ kind: 'move', move: b.dataset.mv }));
    }
    c.querySelectorAll('[data-sw]').forEach(b => b.onclick = async () => {
      const i = +b.dataset.sw;
      if (need === 'pivot' && pendingPick) {
        // Mid-turn switch (U-turn, Baton Pass...): hand the choice back to the waiting move
        const res = pendingPick; pendingPick = null; B.need = null; renderControls(); res(i);
      } else if (forced) {
        const retreat = need === 'retreat' || need === 'pivot';
        busy = true; B.need = null; renderControls();
        await switchIn('p', i, retreat);
        busy = false; persistRun(); renderControls();
      } else runTurn({ kind: 'switch', to: i });
    });
  }

  function shareText(g) {
    const boss = bossOf(g), r = g.result;
    const head = g.mode === 'daily' ? `Daily Champion #${g.num}` : 'Daily Champion (practice)';
    return `${head} ${r.won ? '🏆' : '❌'} vs ${boss.name}\n${diffLabel(g.diff)} · ${r.turns} turns · ${r.left}/6 left\nMe:   ${r.alive.map(a => a ? '🟩' : '🟥').join('')}\nBoss: ${r.bossAlive.map(a => a ? '🔴' : '💀').join('')}${r.shiny && r.shiny.caught ? `\n✨ Shiny caught: ${r.shiny.name}` : ''}`;
  }

  function nextBossCard() {
    const now = new Date(), nb = bossFor(dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)));
    return `<div class="next-boss" style="--boss:${nb.color}">
      <img src="${trainerSrc(nb)}" alt="${esc(nb.name)}" onerror="dcTrainerFallback(this)">
      <div><div class="muted small">UP NEXT</div><b>${esc(nb.name)}</b><div class="muted small">${esc(nb.title)} · ${esc(nb.region)}</div></div>
    </div>`;
  }

  let countdownTimer = null;
  function renderResult() {
    const boss = bossOf(G), r = G.result;
    app.innerHTML = `${practiceBanner()}
      <section class="card result">
        <div class="muted small">${G.mode === 'daily' ? `DAILY #${G.num} · ${G.key}` : 'PRACTICE'} · ${diffLabel(G.diff)}</div>
        <h2 class="${r.won ? 'win' : 'lose'}">${r.won ? 'VICTORY!' : 'DEFEAT'}</h2>
        <p>${r.won ? `You beat ${esc(boss.name)} in ${r.turns} turns with ${r.left} Pokémon standing.` : `${esc(boss.name)} won. You knocked out ${r.ko} of 6.`}</p>
        <div class="grid">${r.alive.map(a => a ? '🟩' : '🟥').join('')}</div>
        <div class="grid">${r.bossAlive.map(a => a ? '🔴' : '💀').join('')}</div>
        ${r.shiny ? (r.shiny.caught
          ? `<div class="shiny-banner">✨ Shiny ${esc(r.shiny.name)} added to your Shiny Dex! <button class="btn ghost small-btn" id="open-dex">View Shiny Dex</button></div>`
          : `<div class="shiny-banner lost">Your shiny ${esc(r.shiny.name)} got away…</div>`) : ''}
        <div class="final-team">${G.picks.map((n, i) => miniCard(n, !r.alive[i], isShiny(n))).join('')}</div>
        <div class="row center">
          <button class="btn" id="share">Share result</button>
          <button class="btn ghost" id="stats2">Stats</button>
          <button class="btn ghost" id="practice2">Practice</button>
        </div>
        ${G.mode === 'daily' ? `<p class="muted" style="margin-top:22px">Next champion in</p><div class="countdown" id="countdown">--:--:--</div>
          ${nextBossCard()}` : ''}
      </section>`;
    $('#share').onclick = () => copyText(shareText(G));
    const od = $('#open-dex'); if (od) od.onclick = openShinyDex;
    $('#stats2').onclick = openStats;
    $('#practice2').onclick = openPracticeMenu;
    bindPracticeBanner();
    tickCountdown();
  }
  function tickCountdown() {
    clearInterval(countdownTimer);
    const upd = () => {
      const el = $('#countdown'); if (!el) return clearInterval(countdownTimer);
      const now = new Date(), mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const s = Math.max(0, Math.floor((mid - now) / 1000));
      if (s === 0) return location.reload();
      el.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
    };
    upd(); countdownTimer = setInterval(upd, 1000);
  }

  // ---------- Modals ----------
  function openModal(html) { $('#modal .modal-card').classList.remove('wide'); $('#modal-body').innerHTML = html; $('#modal').hidden = false; }
  function closeModal() { $('#modal').hidden = true; }
  $('#modal-close').onclick = closeModal;
  $('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 1800); }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); toast('Copied to clipboard!'); }
    catch (e) {
      // Clipboard blocked (for example inside Discord): show the text ready to copy by hand
      openModal(`<h3>SHARE</h3><p class="muted small">Copy this text:</p><textarea id="share-text" readonly style="width:100%;height:120px">${esc(text)}</textarea>`);
      const ta = $('#share-text'); ta.focus(); ta.select();
    }
  }

  function openPracticeMenu() {
    openModal(`<h3>PRACTICE</h3><p class="muted">Practice battles never count toward stats or streaks.</p>
      <div class="row"><button class="btn" id="pr-today">Today's boss, new draft</button><button class="btn ghost" id="pr-rand">Random boss</button></div>`);
    $('#pr-today').onclick = () => { G = newPractice(true); closeModal(); render(); };
    $('#pr-rand').onclick = () => { G = newPractice(false); closeModal(); render(); };
  }

  function computeStats() {
    const done = Object.values(save.days).filter(d => d.mode === 'daily' && d.phase === 'done' && d.result).sort((a, b) => a.num - b.num);
    const wins = done.filter(d => d.result.won);
    let best = 0, run = 0, prev = null;
    for (const d of done) {
      if (d.result.won) { run = prev !== null && d.num === prev + 1 && run > 0 ? run + 1 : 1; best = Math.max(best, run); }
      else run = 0;
      prev = d.num;
    }
    // Current streak: consecutive wins ending today (or yesterday if today isn't finished)
    const byNum = Object.fromEntries(done.map(d => [d.num, d]));
    let n = dayNum(TODAY); if (!byNum[n]) n--;
    let cur = 0; while (byNum[n] && byNum[n].result.won) { cur++; n--; }
    const dist = [1, 2, 3, 4, 5, 6].map(k => wins.filter(d => d.result.left === k).length);
    const perDiff = Object.keys(DIFFS).map(k => { const p = done.filter(d => d.diff === k); return [k, p.length, p.filter(d => d.result.won).length]; });
    return { done, wins, best, cur, dist, perDiff };
  }

  function openStats() {
    const s = computeStats();
    const pct = s.done.length ? Math.round(100 * s.wins.length / s.done.length) : 0;
    const max = Math.max(1, ...s.dist, s.done.length - s.wins.length);
    const bar = (l, v, cls = '') => `<div class="bar"><span>${l}</span><i class="${cls}" style="width:${Math.max(6, 100 * v / max)}%">${v}</i></div>`;
    openModal(`<h3>STATISTICS</h3>
      <div class="stat-tiles"><div><b>${s.done.length}</b><span>Played</span></div><div><b>${pct}%</b><span>Win rate</span></div>
        <div><b>${s.cur}</b><span>Current streak</span></div><div><b>${s.best}</b><span>Best streak</span></div></div>
      <button class="shiny-stat" id="stats-dex">✨ Shiny Dex: <b>${shinyCount()} / ${Object.keys(DEX).length}</b> <span class="muted small">View →</span></button>
      <div class="section-title" style="margin-top:0">POKÉMON LEFT ON WINS</div>
      <div class="dist">${[6, 5, 4, 3, 2, 1].map(k => bar(`${k} left`, s.dist[k - 1])).join('')}${bar('Losses', s.done.length - s.wins.length, 'lose')}</div>
      <div class="section-title">BY DIFFICULTY</div>
      <div class="stat-tiles" style="grid-template-columns:repeat(2,1fr)">${s.perDiff.map(([k, p, w]) =>
        `<div><b>${w}/${p}</b><span>${diffLabel(k)}</span></div>`).join('')}</div>
      <div class="section-title">HISTORY</div>
      ${s.done.length ? `<table class="history"><tr><th>#</th><th>Date</th><th>Boss</th><th>Diff</th><th>Result</th></tr>
        ${s.done.slice(-20).reverse().map(d => `<tr><td>${d.num}</td><td>${d.key}</td><td>${esc(bossOf(d).name)}</td><td>${diffLabel(d.diff)}</td>
          <td>${d.result.won ? `🏆 ${d.result.left}/6` : `❌ ${d.result.ko} KO`}</td></tr>`).join('')}</table>`
        : '<p class="muted">No finished dailies yet.</p>'}`);
    $('#stats-dex').onclick = openShinyDex;
  }

  // Shiny Dex: every species in dex order; collected ones in shiny colours, the rest as silhouettes
  const GENS = [[1, 151], [152, 251], [252, 386], [387, 493], [494, 649], [650, 721], [722, 809], [810, 905], [906, 1025]];
  let dexGen = 0, dexOwnedOnly = false;
  const shinyCount = () => Object.keys(save.shinies).filter(n => DEX[n]).length;
  function openShinyDex() {
    const all = Object.values(DEX).sort((a, b) => a.id - b.id || (a.spr || 0) - (b.spr || 0)), owned = save.shinies;
    const inGen = (sp, g) => !g || (sp.id >= GENS[g - 1][0] && sp.id <= GENS[g - 1][1]);
    const tally = g => `${all.filter(sp => inGen(sp, g) && owned[sp.name]).length}/${all.filter(sp => inGen(sp, g)).length}`;
    const list = all.filter(sp => inGen(sp, dexGen) && (!dexOwnedOnly || owned[sp.name]));
    const num = id => '#' + String(id).padStart(4, '0');
    openModal(`<h3>SHINY DEX · ${shinyCount()} / ${all.length}</h3>
      <p class="muted small" style="margin-top:-4px">Each daily draft card has a 1 in ${SHINY_ODDS} chance to bring a bonus shiny, which can be any Pokémon. Win the daily with it on your team to collect it.</p>
      <div class="role-filter">${['All', ...GENS.map((_, i) => 'Gen ' + (i + 1))].map((l, g) =>
        `<button class="${dexGen === g ? 'on' : ''}" data-gen="${g}">${l} <small>${tally(g)}</small></button>`).join('')}
        <button class="${dexOwnedOnly ? 'on' : ''}" data-owned>Collected only</button></div>
      <div class="dex-grid">${list.map(sp => {
        const o = owned[sp.name];
        return o
          ? `<div class="dex-cell got" title="Caught ${esc(o.date)} vs ${esc(o.boss)} (${diffLabel(o.diff)})"><img class="sprite" src="${front(sprOf(sp), true)}" alt="" loading="lazy"><small>${num(sp.id)}</small><span>${esc(sp.name)}</span></div>`
          : `<div class="dex-cell"><img class="sprite" src="${front(sprOf(sp))}" alt="" loading="lazy"><small>${num(sp.id)}</small><span>???</span></div>`;
      }).join('') || '<p class="muted">No shinies here yet.</p>'}</div>`);
    $('#modal .modal-card').classList.add('wide');
    document.querySelectorAll('[data-gen]').forEach(b => b.onclick = () => { dexGen = +b.dataset.gen; openShinyDex(); });
    $('[data-owned]').onclick = () => { dexOwnedOnly = !dexOwnedOnly; openShinyDex(); };
  }

  function openHelp() {
    openModal(`<h3>HOW TO PLAY</h3>
      <ul>
        <li>Every day a different <b>champion, gym leader or villain</b> from across the Pokémon series waits for you. Everyone faces the same boss.</li>
        <li><b>Draft</b> 6 Pokémon from today's pool of 9. Your first pick leads.</li>
        <li>Choose a <b>difficulty</b>. On Normal the boss is decent but makes mistakes. On Hard its Pokémon have competitively trained stats, it thinks a turn ahead and switches to win matchups, setup moves (Swords Dance, Dragon Dance…) are swapped for attacks on every Pokémon, and there are no effectiveness hints.</li>
        <li>Battles are full 6v6 turn-based fights at Lv. 100 using the Gen 9 rules: the real damage formula, PP, accuracy, crits, priority and every move's added effects (flinching, confusion, stat drops, burns…).</li>
        <li><b>Tactics</b> work too: Protect, Substitute, Stealth Rock and Spikes, Reflect and Light Screen, Trick Room, Leech Seed, Taunt, U-turn and Volt Switch, Roar, Perish Song and more.</li>
        <li><b>Abilities</b> matter: Intimidate, Levitate, Huge Power, Multiscale, Sturdy, absorb abilities and more. Hover an ability to read what it does.</li>
        <li><b>Weather</b>: Drizzle, Drought, Sand Stream and Snow Warning set rain, sun, sand or snow for 5 turns, which boosts moves and speed abilities.</li>
        <li>You get <b>one official attempt</b> per day. Your progress is saved if you close the tab.</li>
        <li>Share a spoiler-free result grid, track streaks and stats, and use <b>Practice</b> for unlimited extra battles.</li>
        <li>A new boss unlocks at your local midnight.</li>
        <li><b>Shiny hunting:</b> each daily draft card has a 1 in 100 chance to bring a bonus ✨ shiny card, and it can be <i>any</i> Pokémon, even weak ones that never appear in the normal pool. Win the daily with it on your team to add it to your <b>Shiny Dex</b> (📖).</li>
      </ul>
      <p class="muted small">Not included: held items (except Pikachu's Light Ball), Mega Evolution, Z-Moves, Dynamax, Terastallization and doubles-only effects.</p>`);
  }

  const REGIONS = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Hisui', 'Unova', 'Kalos', 'Alola', 'Galar', 'Paldea', 'Blueberry'];
  const ROLES = { gym: 'Gym Leader', e4: 'Elite Four', champion: 'Champion', villain: 'Villain', rival: 'Rival' };
  const ROLE_ORDER = Object.keys(ROLES);
  let bossFilter = 'all';
  function openBosses() {
    const today = bossFor(TODAY).key;
    const card = b => `<div class="boss-card" style="--boss:${b.color}">
        <div class="boss-head">
          <img class="sprite" src="${trainerSrc(b)}" alt="" loading="lazy" onerror="dcTrainerFallback(this)">
          <div><b>${esc(b.name)}</b> <span class="role-chip">${ROLES[b.role]}</span>${b.key === today ? ' <span class="today">TODAY</span>' : ''}
            <div class="muted small">${esc(b.title)} · ${esc(b.place)}</div></div>
          <button class="btn ghost small-btn" data-practice="${b.key}">Practice</button>
        </div>
        <div class="boss-team">${b.team.map(n => `<div title="${esc(ABILITIES[n] ? ABILITIES[n] + ': ' + ABILITY_INFO[ABILITIES[n]] : '')}">
          <img class="sprite" src="${front(sprOf(DEX[n]))}" alt="" loading="lazy"><span>${esc(n)}</span></div>`).join('')}</div>
      </div>`;
    const shown = BOSSES.filter(b => bossFilter === 'all' || b.role === bossFilter);
    openModal(`<h3>ALL BOSSES · ${BOSSES.length}</h3>
      <p class="muted small" style="margin-top:-4px">One of these is picked each day. Hover a Pokémon to see its ability.</p>
      <div class="role-filter">${['all', ...ROLE_ORDER].map(r =>
        `<button class="${bossFilter === r ? 'on' : ''}" data-role="${r}">${r === 'all' ? 'All' : ROLES[r]} <small>${r === 'all' ? BOSSES.length : BOSSES.filter(b => b.role === r).length}</small></button>`).join('')}</div>
      ${REGIONS.map(r => {
        const list = shown.filter(b => b.region === r).sort((x, y) => ROLE_ORDER.indexOf(x.role) - ROLE_ORDER.indexOf(y.role));
        return list.length ? `<div class="section-title">${r.toUpperCase()}</div><div class="boss-grid">${list.map(card).join('')}</div>` : '';
      }).join('')}`);
    $('#modal .modal-card').classList.add('wide');
    document.querySelectorAll('[data-role]').forEach(btn => btn.onclick = () => { bossFilter = btn.dataset.role; openBosses(); });
    document.querySelectorAll('[data-practice]').forEach(btn => btn.onclick = () => {
      G = newPractice(false, btn.dataset.practice); closeModal(); render();
    });
  }

  $('#btn-help').onclick = openHelp;
  $('#btn-bosses').onclick = openBosses;
  $('#btn-stats').onclick = openStats;
  $('#btn-dex').onclick = openShinyDex;
  const speedBtn = $('#btn-speed');
  const setSpeedLabel = () => speedBtn.textContent = `${save.settings.speed}×`;
  speedBtn.onclick = () => { save.settings.speed = { 1: 2, 2: 4, 4: 1 }[save.settings.speed] || 1; persist(); setSpeedLabel(); };
  setSpeedLabel();
  const animBtn = $('#btn-anim');
  const setAnimLabel = () => {
    const on = save.settings.anim !== false;
    animBtn.classList.toggle('off', !on);
    animBtn.title = `Move animations: ${on ? 'on' : 'off'}`;
  };
  animBtn.onclick = () => {
    save.settings.anim = save.settings.anim === false;
    persist(); setAnimLabel();
    if (G && G.battle && G.phase === 'battle') FX.weather(G.battle.weather ? G.battle.weather.type : null);
  };
  setAnimLabel();
  FX.setOptions(() => save.settings);

  // ---------- Boot ----------
  G = save.days[TODAY] || newDaily();
  if (!DIFFS[G.diff] && (G.phase === 'intro' || G.phase === 'draft')) G.diff = 'normal';
  // Dailies created before shiny hunting existed get their one roll now (only if not started)
  if (G.mode === 'daily' && !G.shinyRolled && (G.phase === 'intro' || G.phase === 'draft')) {
    G.shiny = rollShiny(G.pool); G.shinyRolled = true; save.days[TODAY] = G; persist();
  }
  if (!save.days[TODAY]) { save.days[TODAY] = G; persist(); if (!save.seenHelp) { save.seenHelp = true; persist(); setTimeout(openHelp, 300); } }
  render();
})();
