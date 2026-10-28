# Tools

`build-dex.js` regenerates `moves-gen.js` (every move with its full effects) and `dex-all.js`, which adds
every Pokémon species (#1–#1025) that `data.js` doesn't hand-curate and Showdown-based sets for curated ones.

1. Download Pokémon Showdown's data into `tools/showdown-data/`:
   - `https://play.pokemonshowdown.com/data/pokedex.json`
   - `https://play.pokemonshowdown.com/data/moves.json`
   - `https://play.pokemonshowdown.com/data/learnsets.json`
   - `https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/random-battles/gen9/sets.json` → save as `sets9.json`
2. Run `node tools/build-dex.js`
3. Run `node tools/verify-data.js`. It checks every Pokémon's stats, types, ability, moves and Hard
   swap move, and every move's numbers, against Showdown's data. It should print "All checks passed."

For each species it picks four moves the battle engine can model (preferring Showdown's random-battle
movepools, then strong same-type and coverage moves from the learnset), the first ability the engine
implements, and a Hard-mode replacement for any setup move.

`tools/showdown-data/` is only needed to rebuild; the site doesn't load it.
