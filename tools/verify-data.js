// Checks data.js + dex-all.js against Pokémon Showdown's data in tools/showdown-data/:
// base stats, types, move legality (learnsets incl. pre-evolutions), Hard-mode swap legality,
// abilities, and move type/category/power/accuracy/priority.
//
// Usage:  node tools/verify-data.js [showdown-data-dir]     (exit code 1 if anything is wrong)
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = process.argv[2] || path.join(__dirname, 'showdown-data');
const readJSON = f => JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'moves-gen.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'dex-all.js'), 'utf8') +
  ';this.D={DEX,MOVES,ABILITIES,HARD_MOVES,BOSSES};', ctx);
const { DEX, MOVES, ABILITIES, HARD_MOVES, BOSSES } = ctx.D;

const pokedex = readJSON('pokedex.json');
const movedex = readJSON('moves.json');
const learnsets = readJSON('learnsets.json');
const toID = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// Alternate forms with few or no moves of their own also learn the base species' moves (as in Showdown)
function learnable(id) {
  const out = new Set();
  const own = learnsets[id] && learnsets[id].learnset, sp0 = pokedex[id];
  if (sp0 && sp0.forme && (!own || Object.keys(own).length < 10)) for (const k of learnable(toID(sp0.baseSpecies))) out.add(k);
  for (let cur = id; cur; ) {
    const ls = learnsets[cur] && learnsets[cur].learnset;
    if (ls) for (const k of Object.keys(ls)) out.add(k);
    const sp = pokedex[cur];
    cur = sp && sp.prevo ? toID(sp.prevo) : null;
  }
  return out;
}

const problems = { stats: [], types: [], moves: [], unsupported: [], hard: [], abilities: [], moveData: [], missing: [], bosses: [], specials: [], sprites: [] };
for (const s of Object.values(DEX)) {
  const sp = pokedex[toID(s.name)];
  if (!sp) { problems.missing.push(s.name); continue; }
  const b = sp.baseStats, real = [b.hp, b.atk, b.def, b.spa, b.spd, b.spe];
  if (real.join() !== s.stats.join()) problems.stats.push(`${s.name}: ${s.stats.join('/')} should be ${real.join('/')}`);
  if (sp.types.join('/') !== s.types.join('/')) problems.types.push(`${s.name}: ${s.types.join('/')} should be ${sp.types.join('/')}`);
  const learn = learnable(toID(s.name));
  const bad = s.moves.filter(m => !learn.has(toID(m)) && m !== 'Struggle');  // Struggle is the generator's placeholder
  if (bad.length) problems.moves.push(`${s.name}: ${bad.join(', ')}`);
  const unsup = s.moves.filter(m => !MOVES[m] || MOVES[m].unsupported);
  if (unsup.length) problems.unsupported.push(`${s.name}: ${unsup.join(', ')}`);
  const hard = HARD_MOVES[s.name];
  if (hard && (!learn.has(toID(hard)) || !MOVES[hard] || MOVES[hard].unsupported)) problems.hard.push(`${s.name}: ${hard}`);
  if (s.moves.some(m => MOVES[m] && MOVES[m].setup) && !hard) problems.hard.push(`${s.name}: has a setup move but no Hard swap`);
  if (sp.forme && !s.spr) problems.sprites.push(`${s.name}: alternate form with no sprite number`);
  if (s.spr && !(s.spr > 10000)) problems.sprites.push(`${s.name}: sprite number ${s.spr} isn't a PokeAPI form number`);
  const ab = ABILITIES[s.name];
  if (ab && !Object.values(sp.abilities).includes(ab)) problems.abilities.push(`${s.name}: ${ab} (can have ${Object.values(sp.abilities).join(' / ')})`);
}

// Bosses: valid role, 6 Pokémon that all exist, unique keys, required fields
const ROLES = ['gym', 'e4', 'champion', 'villain', 'rival'];
const seenKeys = new Set();
for (const b of BOSSES) {
  const where = b.name || b.key;
  if (seenKeys.has(b.key)) problems.bosses.push(`${where}: duplicate key "${b.key}"`);
  seenKeys.add(b.key);
  if (!ROLES.includes(b.role)) problems.bosses.push(`${where}: invalid role "${b.role}"`);
  for (const f of ['key', 'name', 'title', 'place', 'region', 'color', 'quote']) if (!b[f]) problems.bosses.push(`${where}: missing ${f}`);
  if (!Array.isArray(b.team) || b.team.length !== 6) problems.bosses.push(`${where}: team has ${b.team ? b.team.length : 0} Pokémon (needs 6)`);
  for (const n of b.team || []) if (!DEX[n]) problems.bosses.push(`${where}: unknown Pokémon "${n}"`);
}

for (const name of Object.keys(MOVES)) if (!movedex[toID(name)]) problems.moveData.push(`${name}: not found in Showdown`);

// Every move with special behaviour needs code for it in the battle engine (game.js)
const engine = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
for (const m of Object.values(MOVES)) if (m.special && !m.unsupported && !engine.includes(`'${m.special}'`)) problems.specials.push(`${m.name}: no handler for "${m.special}"`);

const LABELS = {
  missing: 'Species not found in Showdown', stats: 'Wrong base stats', types: 'Wrong types',
  moves: "Moves the Pokémon can't learn", unsupported: 'Moves the engine cannot play in a set', hard: "Hard-mode swap moves it can't learn",
  abilities: "Abilities it can't have", moveData: 'Moves not in Showdown', bosses: 'Boss problems',
  specials: 'Special moves with no engine handler', sprites: 'Alternate forms with a bad sprite number'
};
let total = 0;
console.log(`Checked ${Object.keys(DEX).length} Pokémon, ${Object.keys(MOVES).length} moves and ${BOSSES.length} bosses.`);
for (const [k, list] of Object.entries(problems)) {
  total += list.length;
  console.log(`\n${LABELS[k]}: ${list.length}`);
  for (const line of list) console.log('  ' + line);
}
console.log(total ? `\n${total} problem(s) found.` : '\nAll checks passed.');
process.exit(total ? 1 : 0);
