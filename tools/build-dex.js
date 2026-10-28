// Builds the generated data files from Pokémon Showdown's data:
//   moves-gen.js  every move, with full effects (secondaries, multi-hit, charge, hazards...)
//   dex-all.js    every species not hand-curated in data.js, plus movesets for ALL species that have
//                 Showdown Gen 9 random-battle sets (curated Pokémon included), weights and tiers.
//
// Usage:  node tools/build-dex.js [showdown-data-dir]
// Get the data first (see tools/README.md).
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = process.argv[2] || path.join(__dirname, 'showdown-data');
const readJSON = f => JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));

const pokedex = readJSON('pokedex.json');
const movedex = readJSON('moves.json');
const learnsets = readJSON('learnsets.json');
const sets = readJSON('sets9.json');
const toID = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// ---------------------------------------------------------------------------------------------
// 1) Moves
// ---------------------------------------------------------------------------------------------
const CAT = { Physical: 'p', Special: 's', Status: 'x' };
const STATS = ['atk', 'def', 'spa', 'spd', 'spe', 'accuracy', 'evasion'];
const SHORT = { atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe', acc: 'Accuracy', eva: 'Evasion' };
const STATUS_NAMES = { slp: 'sleep', par: 'paralysis', brn: 'a burn', psn: 'poison', tox: 'bad poison', frz: 'freeze' };

// Moves with behaviour implemented by a handler in game.js (keyed by move id)
const SPECIAL = new Set(('return frustration acrobatics grassknot lowkick heavyslam heatcrash gyroball electroball ' +
  'eruption waterspout dragonenergy flail reversal hex venoshock brine storedpower powertrip avalanche revenge payback ' +
  'boltbeak fishiousrend assurance ragefist lastrespects temperflare stompingtantrum facade smellingsalts wakeupslap ' +
  'crushgrip wringout hardpress weatherball terrainpulse risingvoltage expandingforce psyblade mistyexplosion ' +
  'collisioncourse electrodrift hydrosteam solarbeam solarblade pursuit triplekick tripleaxel grassyglide freezedry ' +
  'fakeout firstimpression suckerpunch thunderclap upperhand focuspunch dreameater snore superfang naturesmadness ' +
  'ruination endeavor finalgambit counter mirrorcoat metalburst comeuppance curse bellydrum painsplit haze clearsmog ' +
  'psychup healbell aromatherapy strengthsap rest sleeptalk transform defog rapidspin mortalspin courtchange tidyup ' +
  'perishsong wish healingwish lunardance synthesis morningsun moonlight shoreup roost futuresight doomdesire ' +
  'brickbreak psychicfangs ragingbull steelbeam mindblown chloroblast struggle ficklebeam geomancy meteorbeam ' +
  'electroshot skullbash spiritshackle anchorshot thousandwaves jawlock smackdown auroraveil charge shedtail ' +
  'icespinner filletaway clangoroussoul noretreat bodypress foulplay knockoff seismictoss nightshade').split(' '));

// Moves that need mechanics this game doesn't have (items, doubles, move-calling...)
const BAN = new Set(('poltergeist fling naturalgift belch lastresort steelroller magnitude present psywave bide uproar ' +
  'rollout iceball furycutter echoedvoice round spitup swallow stockpile punishment trumpcard beatup judgment ' +
  'multiattack technoblast revelationdance ivycudgel terablast terastarstorm aurawheel photongeyser shellsidearm ' +
  'thousandarrows synchronoise shelltrap beakblast skydrop alluringvoice burningjealousy lashout ceaselessedge ' +
  'stoneaxe syrupbomb orderup pollenpuff purify floralhealing healpulse lifedew junglehealing spite trick switcheroo ' +
  'bestow skillswap roleplay entrainment simplebeam worryseed gastroacid coreenforcer soak magicpowder forestscurse ' +
  'trickortreat conversion conversion2 reflecttype camouflage imprison torment embargo healblock gravity wonderroom ' +
  'magicroom telekinesis magnetrise electrify iondeluge fairylock quash afteryou instruct allyswitch helpinghand ' +
  'followme ragepowder spotlight wideguard quickguard matblock craftyshield lockon mindreader nightmare grudge snatch ' +
  'mimic sketch metronome assist copycat mefirst mirrormove naturepower attract captivate topsyturvy powersplit ' +
  'guardsplit powerswap guardswap speedswap heartswap powertrick acupressure stuffcheeks teatime decorate coaching ' +
  'dragoncheer revivalblessing doodle splash celebrate happyhour holdhands burnup doubleshock laserfocus luckychant ' +
  'mudsport watersport magiccoat recycle bugbite pluck incinerate covet thief hiddenpower ' +
  'electricterrain2 relicsong secretpower sappyseed sizzlyslide glitzyglow baddybad freezyfrost sparklyswirl ' +
  'bouncybubble buzzybuzz splishysplash zippyzap floatyfall pikapapow veeveevolley').split(' '));

// Volatile states the engine models
const VOLS = new Set(['confusion', 'leechseed', 'substitute', 'protect', 'kingsshield', 'spikyshield', 'banefulbunker',
  'silktrap', 'obstruct', 'burningbulwark', 'endure', 'taunt', 'encore', 'disable', 'yawn', 'destinybond', 'focusenergy',
  'aquaring', 'ingrain', 'partiallytrapped', 'saltcure', 'flinch', 'smackdown', 'charge', 'curse', 'roost']);
const PROTECTS = new Set(['protect', 'kingsshield', 'spikyshield', 'banefulbunker', 'silktrap', 'obstruct', 'burningbulwark']);
const SIDES = new Set(['stealthrock', 'spikes', 'toxicspikes', 'stickyweb', 'reflect', 'lightscreen', 'auroraveil',
  'tailwind', 'safeguard', 'mist']);
const WEATHER = { raindance: 'rain', RainDance: 'rain', sunnyday: 'sun', SunnyDay: 'sun', sandstorm: 'sand', Sandstorm: 'sand', snowscape: 'snow', Snowscape: 'snow', hail: 'snow', Hail: 'snow' };
const TERRAIN = { electricterrain: 'electric', grassyterrain: 'grassy', psychicterrain: 'psychic', mistyterrain: 'misty' };
const INVULN = { fly: 'air', bounce: 'air', dig: 'under', dive: 'water', phantomforce: 'vanish', shadowforce: 'vanish' };
const BAD_TARGETS = new Set(['allies', 'adjacentAlly', 'allyTeam', 'adjacentAllyOrSelf', 'scripted']);
const BAD_NONSTANDARD = new Set(['Unobtainable', 'CAP', 'LGPE', 'Custom', 'Gigantamax', 'Future']);
// Setup moves (swapped out on Hard) that are implemented as handlers rather than plain boosts
const SPECIAL_SETUP = new Set(['bellydrum', 'filletaway', 'clangoroussoul', 'noretreat', 'tidyup', 'geomancy', 'curse']);

function statBoosts(b) {
  if (!b) return null;
  const o = {};
  for (const k of STATS) if (b[k]) o[k === 'accuracy' ? 'acc' : k === 'evasion' ? 'eva' : k] = b[k];
  return Object.keys(o).length ? o : null;
}
const boostText = b => Object.entries(b).map(([k, v]) => `${v > 0 ? '+' : '−'}${Math.abs(v)} ${SHORT[k]}`).join(', ');

function convMove(id, m) {
  const o = { name: m.name, type: m.type, cat: CAT[m.category], power: m.basePower || 0, acc: m.accuracy === true ? 0 : m.accuracy, pp: m.pp };
  if (m.priority) o.prio = m.priority;
  const f = m.flags || {};
  for (const fl of ['contact', 'punch', 'bite', 'pulse', 'slicing', 'sound', 'bullet', 'wind', 'powder']) if (f[fl]) o[fl] = true;
  if (f.protect) o.protectable = true;
  if (f.bypasssub) o.bypassSub = true;
  if (f.reflectable) o.reflectable = true;
  if (f.defrost) o.thaw = true;
  if (f.cantusetwice) o.noRepeat = true;
  if (m.thawsTarget) o.thawsTarget = true;
  if (m.drain) o.drain = m.drain[0] / m.drain[1];
  if (m.recoil) o.recoil = m.recoil[0] / m.recoil[1];
  if (m.hasCrashDamage) o.crash = true;
  if (m.willCrit) o.crit = 'always'; else if (m.critRatio >= 2) o.crit = m.critRatio - 1;
  if (m.overrideDefensiveStat === 'def') o.psyshock = true;
  if (m.ignoreDefensive) o.ignoreDef = true;
  if (m.ignoreEvasion) o.ignoreEva = true;
  if (m.breaksProtect) o.breaksProtect = true;
  if (m.sleepUsable) o.sleepUsable = true;
  if (m.heal) o.heal = m.heal[0] / m.heal[1];
  if (m.multihit) o.multi = m.multihit;
  if (m.multiaccuracy) o.multiacc = true;
  if (f.charge) { o.charge = true; if (INVULN[id]) o.invuln = INVULN[id]; }
  if (f.recharge) o.recharge = true;
  if (m.self && m.self.volatileStatus === 'lockedmove') o.lock = true;
  if (m.self && m.self.volatileStatus === 'glaiverush') o.glaive = true;
  if (m.ohko) o.ohko = m.ohko === true ? true : m.ohko;
  if (m.damage) o.fixed = m.damage;
  if (m.selfdestruct) o.selfKO = m.selfdestruct;
  if (m.selfSwitch) o.pivot = m.selfSwitch === true ? true : m.selfSwitch === 'copyvolatile' ? 'pass' : 'shed';
  if (m.forceSwitch) o.phaze = true;
  if (SPECIAL.has(id)) o.special = id;

  // Boosts: on the user (self), on the target (tgt)
  const selfB = statBoosts(m.self && m.self.boosts) || statBoosts(m.selfBoost && m.selfBoost.boosts);
  const topB = statBoosts(m.boosts);
  if (o.cat === 'x' && topB && m.target === 'self') o.self = topB;
  else if (topB) o.tgt = topB;
  if (selfB) o.self = Object.assign(o.self || {}, selfB);
  if (m.status) o.inflict = m.status;

  // Secondary effects (each rolls separately)
  const secs = (m.secondaries || (m.secondary ? [m.secondary] : [])).map(s => {
    const e = { ch: s.chance || 100 };
    if (s.status) e.st = s.status;
    if (s.volatileStatus) e.vol = s.volatileStatus;
    const tb = statBoosts(s.boosts); if (tb) e.tgt = tb;
    const sb = statBoosts(s.self && s.self.boosts); if (sb) e.self = sb;
    return e;
  }).filter(e => e.st || e.vol || e.tgt || e.self);
  if (secs.length) o.secs = secs;

  if (m.volatileStatus) o.vol = m.volatileStatus;
  if (m.stallingMove) o.stall = true;
  if (m.sideCondition) { o.side = m.sideCondition; o.sideFoe = m.target === 'foeSide'; }
  if (m.pseudoWeather) o.field = m.pseudoWeather;
  if (m.weather) o.weather = WEATHER[m.weather] || null;
  if (m.terrain) o.terrain = TERRAIN[m.terrain] || null;

  // Is it something the engine can play correctly?
  let ok = !BAN.has(id) && !BAD_TARGETS.has(m.target) && !id.startsWith('hiddenpower');
  if ((m.basePowerCallback || m.damageCallback) && !SPECIAL.has(id)) ok = false;
  if (m.callsMove && id !== 'sleeptalk') ok = false;
  if (m.slotCondition && !SPECIAL.has(id)) ok = false;
  if (o.vol && !VOLS.has(o.vol)) ok = false;
  for (const s of secs) if (s.vol && !VOLS.has(s.vol)) ok = false;
  if (o.side && !SIDES.has(o.side)) ok = false;
  if (o.field && o.field !== 'trickroom') ok = false;
  if (m.weather && !o.weather) ok = false;
  if (m.terrain && !o.terrain) ok = false;
  if (o.cat === 'x' && !SPECIAL.has(id) && !(o.heal || o.self || o.tgt || o.inflict || o.vol || o.side || o.field ||
    o.weather || o.terrain || o.pivot || o.phaze || o.selfKO)) ok = false;
  if (o.cat !== 'x' && !o.power && !o.fixed && !o.ohko && !SPECIAL.has(id)) ok = false;
  if (!ok) o.unsupported = true;

  if (PROTECTS.has(o.vol)) o.protect = o.vol;
  if (o.cat === 'x' && ((o.self && Object.values(o.self).some(v => v > 0) && !o.heal && !o.pivot) || SPECIAL_SETUP.has(id))) o.setup = true;
  if (o.cat === 'x') o.desc = describe(id, o);
  return o;
}

function describe(id, o) {
  const d = [];
  const SPECIAL_DESC = {
    curse: 'Ghost: lose 1/2 HP to curse the foe. Others: +1 Atk/Def, −1 Spe.', bellydrum: 'Lose 1/2 HP to maximize Attack.',
    painsplit: "Shares HP evenly with the foe.", haze: 'Resets all stat changes.', psychup: "Copies the foe's stat changes.",
    healbell: "Cures your team's status.", aromatherapy: "Cures your team's status.", strengthsap: "Heals by the foe's Attack and lowers it.",
    rest: 'Fully heals, then sleeps for 2 turns.', sleeptalk: 'Uses a random move while asleep.', transform: 'Transforms into the foe.',
    defog: 'Clears hazards and screens; −1 foe Evasion.', courtchange: 'Swaps hazards and screens between sides.',
    tidyup: '+1 Atk/Spe; removes hazards and Substitutes.', perishsong: 'Everything on the field faints in 3 turns.',
    wish: 'Heals 1/2 HP at the end of next turn.', healingwish: 'Faints to fully heal the next Pokémon.',
    lunardance: 'Faints to fully heal the next Pokémon.', synthesis: 'Heals by weather (1/2, 2/3 in sun).',
    morningsun: 'Heals by weather (1/2, 2/3 in sun).', moonlight: 'Heals by weather (1/2, 2/3 in sun).',
    shoreup: 'Heals 1/2 HP (2/3 in sand).', roost: 'Heals 1/2 HP; loses Flying type this turn.', auroraveil: 'Halves damage for 5 turns (needs snow).',
    charge: 'Doubles next Electric move; +1 SpD.', shedtail: 'Uses 1/2 HP to pass a Substitute to the next Pokémon.',
    filletaway: 'Lose 1/2 HP: +2 Atk/SpA/Spe.', clangoroussoul: 'Lose 1/3 HP: +1 to all stats.', noretreat: '+1 to all stats; can no longer switch.',
    geomancy: 'Charges, then +2 SpA/SpD/Spe.'
  };
  if (SPECIAL_DESC[id]) return SPECIAL_DESC[id];
  if (o.protect) d.push(o.protect === 'protect' ? 'Protects from attacks this turn.' : 'Protects this turn; punishes contact.');
  if (o.vol === 'endure') d.push('Survives any hit with 1 HP this turn.');
  if (o.vol === 'substitute') d.push('Uses 1/4 HP to make a Substitute.');
  if (o.vol === 'confusion') d.push('Confuses the target.');
  if (o.vol === 'leechseed') d.push('Drains 1/8 HP from the target each turn.');
  if (o.vol === 'taunt') d.push('Target can only use attacks for 3 turns.');
  if (o.vol === 'encore') d.push('Target repeats its last move for 3 turns.');
  if (o.vol === 'disable') d.push("Disables the target's last move for 4 turns.");
  if (o.vol === 'yawn') d.push('Target falls asleep at the end of next turn.');
  if (o.vol === 'destinybond') d.push('If KOd this turn, the attacker faints too.');
  if (o.vol === 'focusenergy') d.push('Raises critical-hit ratio.');
  if (o.vol === 'aquaring' || o.vol === 'ingrain') d.push('Heals 1/16 HP each turn.');
  if (o.heal) d.push(`Restores ${o.heal === 0.5 ? 'half' : Math.round(o.heal * 100) + '% of'} max HP.`);
  if (o.self) d.push(boostText(o.self) + ' (user).');
  if (o.tgt) d.push(boostText(o.tgt) + ' (target).');
  if (o.inflict) d.push(`Inflicts ${STATUS_NAMES[o.inflict]}.`);
  const SIDE_TEXT = { stealthrock: 'Sets Stealth Rock on the foe\'s side.', spikes: 'Sets a layer of Spikes.', toxicspikes: 'Sets a layer of Toxic Spikes.',
    stickyweb: 'Sets a Sticky Web.', reflect: 'Halves physical damage for 5 turns.', lightscreen: 'Halves special damage for 5 turns.',
    tailwind: 'Doubles your team\'s Speed for 4 turns.', safeguard: 'Protects your team from status for 5 turns.', mist: 'Protects your team from stat drops for 5 turns.' };
  if (o.side) d.push(SIDE_TEXT[o.side] || '');
  if (o.field === 'trickroom') d.push('Slower Pokémon move first for 5 turns.');
  if (o.weather) d.push(`Sets ${{ rain: 'rain', sun: 'harsh sunlight', sand: 'a sandstorm', snow: 'snow' }[o.weather]} for 5 turns.`);
  if (o.terrain) d.push(`Sets ${o.terrain[0].toUpperCase() + o.terrain.slice(1)} Terrain for 5 turns.`);
  if (o.phaze) d.push('Forces the target to switch out.');
  if (o.pivot) d.push(o.pivot === 'pass' ? 'Switches out, passing stat changes.' : 'Switches the user out.');
  if (o.selfKO) d.push('The user faints.');
  return d.join(' ') || 'Status move.';
}

const MOVES = {};
for (const [id, m] of Object.entries(movedex)) {
  if (!m || m.isZ || m.isMax || BAD_NONSTANDARD.has(m.isNonstandard) || id.startsWith('hiddenpower') && id !== 'hiddenpower') continue;
  if (m.name.startsWith('G-Max') || m.name.startsWith('Max ')) continue;
  MOVES[m.name] = convMove(id, m);
}
const movesOut = `// GENERATED by tools/build-dex.js from Pokémon Showdown's moves.json. Do not edit by hand.
// Every move with its full effects. "unsupported" moves need mechanics this game doesn't have
// (held items, doubles, move-calling...) and are never put in movesets.
const MOVES = {
${Object.entries(MOVES).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n')}
};
`;
fs.writeFileSync(path.join(ROOT, 'moves-gen.js'), movesOut);

// ---------------------------------------------------------------------------------------------
// 2) Species and movesets
// ---------------------------------------------------------------------------------------------
const ctx = {};
vm.createContext(ctx);
vm.runInContext(movesOut + fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8') +
  ';this.DEX=DEX;this.ABILITY_INFO=ABILITY_INFO;this.CHART=CHART;this.HARD_MOVES=HARD_MOVES;this.MOVES=MOVES;', ctx);
const { DEX, ABILITY_INFO, CHART, HARD_MOVES } = ctx;
const TYPES = Object.keys(CHART);
const usable = n => MOVES[n] && !MOVES[n].unsupported;

function learnable(id) {
  const out = new Set();
  for (let cur = id; cur; ) {
    const ls = learnsets[cur] && learnsets[cur].learnset;
    if (ls) for (const k of Object.keys(ls)) out.add(k);
    const sp = pokedex[cur];
    cur = sp && sp.prevo ? toID(sp.prevo) : null;
  }
  return [...out];
}
const effOn = (type, defType) => { const x = (CHART[type] || {})[defType]; return x === undefined ? 1 : x; };
const avgHits = mv => Array.isArray(mv.multi) ? (mv.multi[1] === 5 ? 3.1 : (mv.multi[0] + mv.multi[1]) / 2) : (mv.multi || 1);
const effPower = mv => mv.fixed ? 90 : mv.ohko ? 60 : !mv.power ? 80 : mv.power * avgHits(mv);

function pickMoves(sp, id) {
  const st = sp.baseStats, types = sp.types, best = Math.max(st.atk, st.spa);
  const value = mv => {
    if (mv.cat === 'x') return 0;
    let v = effPower(mv) * (mv.acc ? mv.acc / 100 : 1) * (types.includes(mv.type) ? 1.5 : 1);
    v *= (mv.cat === 'p' ? st.atk : st.spa) / best;
    if (mv.prio > 0) v *= 0.7;
    if (mv.recoil) v *= 0.92;
    if (mv.self && Object.values(mv.self).some(x => x < 0)) v *= 0.9;
    if (mv.recharge || mv.charge && !mv.invuln) v *= 0.55;
    if (mv.selfKO) v *= 0.3;
    if (mv.drain) v *= 1.05;
    if (mv.pivot) v *= 1.1;
    if (effPower(mv) < 55 && !(mv.prio > 0) && !mv.pivot) v *= 0.3;
    return v;
  };
  const learnSet = new Set(learnable(id));
  const legal = n => learnSet.has(toID(n));
  const roles = sets[id] ? sets[id].sets : [];
  const role = roles[0];
  const pool = role ? [...new Set(role.movepool)].filter(n => usable(n) && legal(n)).map(n => MOVES[n]) : [];
  const allLearn = [...new Map(learnable(id).map(k => movedex[k] && MOVES[movedex[k].name]).filter(m => m && !m.unsupported).map(m => [m.name, m])).values()];
  const attacks = (role ? pool : allLearn).filter(m => m.cat !== 'x');
  const chosen = [];

  if (role) {
    // Utility first: what the role is about (setup / hazards / recovery / pivot / status), at most 2
    const status = pool.filter(m => m.cat === 'x');
    const rank = m => (m.setup && /Setup/.test(role.role) ? 100 : 0) + (m.side === 'stealthrock' ? 90 : 0) + (m.heal || ['wish', 'synthesis', 'moonlight', 'morningsun', 'shoreup', 'roost', 'rest', 'strengthsap'].includes(toID(m.name)) ? 80 : 0) +
      (m.side && m.sideFoe ? 60 : 0) + (m.pivot ? 55 : 0) + (m.inflict ? 50 : 0) + (m.vol === 'leechseed' || m.vol === 'substitute' ? 45 : 0) + (m.protect ? 30 : 0) + (m.setup ? 40 : 0) + 10;
    const slots = /Support|Bulky|Wallbreaker/.test(role.role) ? 2 : 1;
    for (const m of status.sort((a, b) => rank(b) - rank(a))) if (chosen.length < Math.min(slots, Math.max(0, 4 - Math.min(2, attacks.length)))) chosen.push(m);
  }
  const fill = list => {
    while (chosen.length < 4) {
      let pick = null, top = 0;
      for (const m of list) {
        if (chosen.includes(m) || m.cat === 'x') continue;
        const dmgTypes = chosen.filter(c => c.cat !== 'x').map(c => c.type);
        let s = value(m);
        if (dmgTypes.includes(m.type)) s *= 0.35;
        const newSE = TYPES.filter(t => effOn(m.type, t) > 1 && !dmgTypes.some(dt => effOn(dt, t) > 1)).length;
        s *= 1 + 0.12 * newSE;
        if (s > top) { top = s; pick = m; }
      }
      if (!pick) break;
      chosen.push(pick);
    }
  };
  fill(attacks);
  if (chosen.length < 4 && role) for (const m of pool) if (chosen.length < 4 && !chosen.includes(m)) chosen.push(m);
  if (chosen.length < 4) fill(allLearn.filter(m => m.cat !== 'x'));
  if (chosen.length < 4) for (const m of allLearn) if (chosen.length < 4 && m.cat === 'x' && !chosen.includes(m) && (m.inflict || m.heal)) chosen.push(m);
  if (!chosen.some(m => m.cat !== 'x')) chosen.unshift(MOVES['Struggle']);

  let hard = null;
  if (chosen.some(m => m.setup)) {
    const alt = allLearn.filter(m => m.cat !== 'x' && !chosen.includes(m)).sort((a, b) => value(b) - value(a))[0];
    if (alt) hard = alt.name;
  }
  return { moves: chosen.slice(0, 4).map(m => m.name), hard };
}

function pickAbility(sp, id) {
  const cands = [];
  if (sets[id]) for (const s of sets[id].sets) cands.push(...(s.abilities || []));
  cands.push(...['0', '1', 'H'].map(k => sp.abilities[k]).filter(Boolean));
  return cands.find(a => ABILITY_INFO[a]) || null;
}

const curatedByNum = new Map(Object.values(DEX).map(s => [s.id, s]));
const rows = [], curatedSets = {};
for (const [id, sp] of Object.entries(pokedex)) {
  if (!(sp.num > 0 && sp.num <= 1025) || sp.forme) continue;
  const tags = sp.tags || [];
  const tier = tags.includes('Restricted Legendary') || tags.includes('Mythical') ? 'L'
    : tags.some(t => ['Sub-Legendary', 'Paradox', 'Ultra Beast'].includes(t)) ? 'S' : 0;
  const cur = curatedByNum.get(sp.num);
  if (cur) {
    // Curated Pokémon keep their hand-written set unless Showdown has a random-battle set for them
    if (sets[id]) curatedSets[cur.name] = pickMoves(sp, id);
    continue;
  }
  const b = sp.baseStats;
  const { moves, hard } = pickMoves(sp, id);
  rows.push([sp.name, sp.num, sp.types.join('/'), [b.hp, b.atk, b.def, b.spa, b.spd, b.spe], moves, pickAbility(sp, id) || 0, hard || 0, tier]);
}
rows.sort((a, b) => a[1] - b[1]);

const weights = {};
for (const [id, sp] of Object.entries(pokedex)) if (sp.num > 0 && sp.num <= 1025 && !sp.forme) weights[toID(sp.name)] = sp.weightkg;

const out = `// GENERATED by tools/build-dex.js from Pokémon Showdown data. Do not edit by hand.
// Adds every species not hand-curated in data.js, and Showdown random-battle movesets for curated ones.
(function () {
  // [name, dex #, types, base stats, moves, ability, hard-mode move, tier (L legendary / S sub-legendary)]
  const GEN_DEX = [
${rows.map(r => '    ' + JSON.stringify(r)).join(',\n')}
  ];
  // Movesets for hand-curated Pokémon (from Showdown's Gen 9 random-battle movepools)
  const CURATED_SETS = ${JSON.stringify(curatedSets)};
  // Weight in kg for every species, keyed by lowercase name without symbols
  const GEN_WT = ${JSON.stringify(weights)};
  for (const [name, id, types, stats, moves, ability, hard, tier] of GEN_DEX) {
    if (DEX[name]) continue;
    DEX[name] = { name, id, types: types.split('/'), stats, moves, leg: tier === 'L', tier: tier || null };
    if (ability) ABILITIES[name] = ability;
    if (hard) HARD_MOVES[name] = hard;
  }
  for (const [name, set] of Object.entries(CURATED_SETS)) {
    if (!DEX[name]) continue;
    DEX[name].moves = set.moves;
    if (set.hard) HARD_MOVES[name] = set.hard; else delete HARD_MOVES[name];
  }
  for (const sp of Object.values(DEX)) sp.wt = GEN_WT[sp.name.toLowerCase().replace(/[^a-z0-9]/g, '')] || 50;
})();
`;
fs.writeFileSync(path.join(ROOT, 'dex-all.js'), out);
const nMoves = Object.keys(MOVES).length, nOk = Object.values(MOVES).filter(m => !m.unsupported).length;
console.log(`moves ${nMoves} (${nOk} supported), generated species ${rows.length}, curated sets from Showdown ${Object.keys(curatedSets).length}`);
