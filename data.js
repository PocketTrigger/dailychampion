// ---------- Types ----------
const TYPE_COLORS = {
  Normal: '#a8a77a', Fire: '#ee8130', Water: '#6390f0', Electric: '#d9b322', Grass: '#7ac74c',
  Ice: '#73c9c4', Fighting: '#c22e28', Poison: '#a33ea1', Ground: '#d0a54a', Flying: '#a98ff3',
  Psychic: '#f95587', Bug: '#a6b91a', Rock: '#b6a136', Ghost: '#735797', Dragon: '#6f35fc',
  Dark: '#705746', Steel: '#9a9ab5', Fairy: '#d685ad'
};

// Attacking type -> defending type -> multiplier (only non-1 entries)
const CHART = {
  Normal: { Rock: .5, Ghost: 0, Steel: .5 },
  Fire: { Fire: .5, Water: .5, Grass: 2, Ice: 2, Bug: 2, Rock: .5, Dragon: .5, Steel: 2 },
  Water: { Fire: 2, Water: .5, Grass: .5, Ground: 2, Rock: 2, Dragon: .5 },
  Electric: { Water: 2, Electric: .5, Grass: .5, Ground: 0, Flying: 2, Dragon: .5 },
  Grass: { Fire: .5, Water: 2, Grass: .5, Poison: .5, Ground: 2, Flying: .5, Bug: .5, Rock: 2, Dragon: .5, Steel: .5 },
  Ice: { Fire: .5, Water: .5, Grass: 2, Ice: .5, Ground: 2, Flying: 2, Dragon: 2, Steel: .5 },
  Fighting: { Normal: 2, Ice: 2, Poison: .5, Flying: .5, Psychic: .5, Bug: .5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2, Fairy: .5 },
  Poison: { Grass: 2, Poison: .5, Ground: .5, Rock: .5, Ghost: .5, Steel: 0, Fairy: 2 },
  Ground: { Fire: 2, Electric: 2, Grass: .5, Poison: 2, Flying: 0, Bug: .5, Rock: 2, Steel: 2 },
  Flying: { Electric: .5, Grass: 2, Fighting: 2, Bug: 2, Rock: .5, Steel: .5 },
  Psychic: { Fighting: 2, Poison: 2, Psychic: .5, Dark: 0, Steel: .5 },
  Bug: { Fire: .5, Grass: 2, Fighting: .5, Poison: .5, Flying: .5, Psychic: 2, Ghost: .5, Dark: 2, Steel: .5, Fairy: .5 },
  Rock: { Fire: 2, Ice: 2, Fighting: .5, Ground: .5, Flying: 2, Bug: 2, Steel: .5 },
  Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: .5 },
  Dragon: { Dragon: 2, Steel: .5, Fairy: 0 },
  Dark: { Fighting: .5, Psychic: 2, Ghost: 2, Dark: .5, Fairy: .5 },
  Steel: { Fire: .5, Water: .5, Electric: .5, Ice: 2, Rock: 2, Steel: .5, Fairy: 2 },
  Fairy: { Fire: .5, Fighting: 2, Poison: .5, Dragon: 2, Dark: 2, Steel: .5 }
};

// ---------- Moves ----------
// All move data is generated from Pokémon Showdown into moves-gen.js (see tools/build-dex.js),
// which must be loaded before this file.

// ---------- Pokédex ----------
// name, national dex #, types, base stats [HP, Atk, Def, SpA, SpD, Spe], moves,
// tier: true or 'L' = restricted legendary / mythical, 'S' = sub-legendary
const DEX = {};
function P(name, id, types, stats, moves, tier) {
  tier = tier === true ? 'L' : tier || null;
  DEX[name] = { name, id, types: types.split('/'), stats, moves, leg: tier === 'L', tier };
}

// Gen 1
P('Venusaur', 3, 'Grass/Poison', [80, 82, 83, 100, 100, 80], ['Energy Ball', 'Sludge Bomb', 'Sleep Powder', 'Synthesis']);
P('Charizard', 6, 'Fire/Flying', [78, 84, 78, 109, 85, 100], ['Flamethrower', 'Air Slash', 'Dragon Pulse', 'Focus Blast']);
P('Blastoise', 9, 'Water', [79, 83, 100, 85, 105, 78], ['Scald', 'Ice Beam', 'Flash Cannon', 'Dark Pulse']);
P('Pidgeot', 18, 'Normal/Flying', [83, 80, 75, 70, 70, 101], ['Brave Bird', 'Return', 'Quick Attack', 'Roost']);
P('Pikachu', 25, 'Electric', [35, 55, 40, 50, 50, 90], ['Volt Tackle', 'Iron Tail', 'Quick Attack', 'Thunderbolt']);
P('Raichu', 26, 'Electric', [60, 90, 55, 90, 80, 110], ['Thunderbolt', 'Focus Blast', 'Surf', 'Nasty Plot']);
P('Nidoqueen', 31, 'Poison/Ground', [90, 92, 87, 75, 85, 76], ['Earth Power', 'Sludge Bomb', 'Ice Beam', 'Flamethrower']);
P('Nidoking', 34, 'Poison/Ground', [81, 102, 77, 85, 75, 85], ['Earth Power', 'Sludge Wave', 'Ice Beam', 'Flamethrower']);
P('Clefable', 36, 'Fairy', [95, 70, 73, 95, 90, 60], ['Moonblast', 'Flamethrower', 'Calm Mind', 'Moonlight']);
P('Ninetales', 38, 'Fire', [73, 76, 75, 81, 100, 100], ['Flamethrower', 'Nasty Plot', 'Dark Pulse', 'Psyshock']);
P('Vileplume', 45, 'Grass/Poison', [75, 80, 85, 110, 90, 50], ['Giga Drain', 'Sludge Bomb', 'Sleep Powder', 'Moonblast']);
P('Dugtrio', 51, 'Ground', [35, 100, 50, 50, 70, 120], ['Earthquake', 'Stone Edge', 'Sucker Punch', 'Swords Dance']);
P('Persian', 53, 'Normal', [65, 70, 60, 65, 65, 115], ['Return', 'Knock Off', 'Play Rough', 'Gunk Shot']);
P('Golduck', 55, 'Water', [80, 82, 78, 95, 80, 85], ['Hydro Pump', 'Ice Beam', 'Psyshock', 'Calm Mind']);
P('Arcanine', 59, 'Fire', [90, 110, 80, 100, 80, 95], ['Flare Blitz', 'Extreme Speed', 'Wild Charge', 'Close Combat']);
P('Poliwrath', 62, 'Water/Fighting', [90, 95, 95, 70, 90, 70], ['Liquidation', 'Close Combat', 'Ice Punch', 'Bulk Up']);
P('Alakazam', 65, 'Psychic', [55, 50, 45, 135, 95, 120], ['Psychic', 'Shadow Ball', 'Focus Blast', 'Calm Mind']);
P('Machamp', 68, 'Fighting', [90, 130, 80, 65, 85, 55], ['Close Combat', 'Knock Off', 'Stone Edge', 'Bullet Punch']);
P('Victreebel', 71, 'Grass/Poison', [80, 105, 65, 100, 70, 70], ['Power Whip', 'Poison Jab', 'Sucker Punch', 'Swords Dance']);
P('Tentacruel', 73, 'Water/Poison', [80, 70, 65, 80, 120, 100], ['Scald', 'Sludge Bomb', 'Ice Beam', 'Toxic']);
P('Golem', 76, 'Rock/Ground', [80, 120, 130, 55, 65, 45], ['Earthquake', 'Stone Edge', 'Fire Punch', 'Sucker Punch']);
P('Rapidash', 78, 'Fire', [65, 100, 70, 80, 80, 105], ['Flare Blitz', 'Wild Charge', 'High Horsepower', 'Megahorn']);
P('Slowbro', 80, 'Water/Psychic', [95, 75, 110, 100, 80, 30], ['Scald', 'Psyshock', 'Ice Beam', 'Slack Off']);
P('Muk', 89, 'Poison', [105, 105, 75, 65, 100, 50], ['Poison Jab', 'Knock Off', 'Drain Punch', 'Ice Punch']);
P('Cloyster', 91, 'Water/Ice', [50, 95, 180, 85, 45, 70], ['Shell Smash', 'Icicle Crash', 'Liquidation', 'Drill Run']);
P('Gengar', 94, 'Ghost/Poison', [60, 65, 60, 130, 75, 110], ['Shadow Ball', 'Sludge Bomb', 'Focus Blast', 'Hypnosis']);
P('Exeggutor', 103, 'Grass/Psychic', [95, 95, 85, 125, 75, 55], ['Energy Ball', 'Psychic', 'Sleep Powder', 'Sludge Bomb']);
P('Hitmonlee', 106, 'Fighting', [50, 120, 53, 35, 110, 87], ['High Jump Kick', 'Knock Off', 'Stone Edge', 'Poison Jab']);
P('Rhydon', 112, 'Ground/Rock', [105, 130, 120, 45, 45, 40], ['Earthquake', 'Stone Edge', 'Megahorn', 'Swords Dance']);
P('Kangaskhan', 115, 'Normal', [105, 95, 80, 40, 80, 90], ['Return', 'Earthquake', 'Sucker Punch', 'Drain Punch']);
P('Starmie', 121, 'Water/Psychic', [60, 75, 85, 100, 85, 115], ['Hydro Pump', 'Psyshock', 'Thunderbolt', 'Ice Beam']);
P('Tauros', 128, 'Normal', [75, 100, 95, 40, 70, 110], ['Double-Edge', 'Earthquake', 'Close Combat', 'Zen Headbutt']);
P('Gyarados', 130, 'Water/Flying', [95, 125, 79, 60, 100, 81], ['Waterfall', 'Earthquake', 'Crunch', 'Dragon Dance']);
P('Lapras', 131, 'Water/Ice', [130, 85, 80, 85, 95, 60], ['Freeze-Dry', 'Surf', 'Thunderbolt', 'Psychic']);
P('Vaporeon', 134, 'Water', [130, 65, 60, 110, 95, 65], ['Scald', 'Ice Beam', 'Shadow Ball', 'Toxic']);
P('Jolteon', 135, 'Electric', [65, 65, 60, 110, 95, 130], ['Thunderbolt', 'Shadow Ball', 'Hyper Voice', 'Thunder Wave']);
P('Aerodactyl', 142, 'Rock/Flying', [80, 105, 65, 60, 75, 130], ['Stone Edge', 'Earthquake', 'Crunch', 'Iron Head']);
P('Snorlax', 143, 'Normal', [160, 110, 65, 65, 110, 30], ['Body Slam', 'Earthquake', 'Crunch', 'Curse']);
P('Articuno', 144, 'Ice/Flying', [90, 85, 100, 95, 125, 85], ['Ice Beam', 'Hurricane', 'Freeze-Dry', 'Roost'], 'S');
P('Zapdos', 145, 'Electric/Flying', [90, 90, 85, 125, 90, 100], ['Thunderbolt', 'Hurricane', 'Heat Wave', 'Roost'], 'S');
P('Moltres', 146, 'Fire/Flying', [90, 100, 90, 125, 85, 90], ['Flamethrower', 'Hurricane', 'Will-O-Wisp', 'Roost'], 'S');
P('Dragonite', 149, 'Dragon/Flying', [91, 134, 95, 100, 100, 80], ['Dragon Dance', 'Outrage', 'Extreme Speed', 'Earthquake']);
// Gen 2
P('Meganium', 154, 'Grass', [80, 82, 100, 83, 100, 80], ['Giga Drain', 'Earthquake', 'Synthesis', 'Toxic']);
P('Typhlosion', 157, 'Fire', [78, 84, 78, 109, 85, 100], ['Flamethrower', 'Focus Blast', 'Shadow Ball', 'Will-O-Wisp']);
P('Feraligatr', 160, 'Water', [85, 105, 100, 79, 83, 78], ['Liquidation', 'Ice Punch', 'Crunch', 'Dragon Dance']);
P('Crobat', 169, 'Poison/Flying', [85, 90, 80, 70, 80, 130], ['Brave Bird', 'Leech Life', 'Roost', 'Toxic']);
P('Ampharos', 181, 'Electric', [90, 75, 85, 115, 90, 55], ['Thunderbolt', 'Dragon Pulse', 'Focus Blast', 'Thunder Wave']);
P('Espeon', 196, 'Psychic', [65, 65, 60, 130, 95, 110], ['Psychic', 'Shadow Ball', 'Dazzling Gleam', 'Calm Mind']);
P('Umbreon', 197, 'Dark', [95, 65, 110, 60, 130, 65], ['Dark Pulse', 'Psychic', 'Moonlight', 'Toxic']);
P('Steelix', 208, 'Steel/Ground', [75, 85, 200, 55, 65, 30], ['Earthquake', 'Iron Head', 'Rock Slide', 'Toxic']);
P('Scizor', 212, 'Bug/Steel', [70, 130, 100, 55, 80, 65], ['Bullet Punch', 'X-Scissor', 'Knock Off', 'Swords Dance']);
P('Heracross', 214, 'Bug/Fighting', [80, 125, 75, 40, 95, 85], ['Close Combat', 'Megahorn', 'Stone Edge', 'Knock Off']);
P('Skarmory', 227, 'Steel/Flying', [65, 80, 140, 40, 70, 70], ['Brave Bird', 'Iron Head', 'Roost', 'Toxic']);
P('Houndoom', 229, 'Dark/Fire', [75, 90, 50, 110, 80, 95], ['Dark Pulse', 'Flamethrower', 'Sludge Bomb', 'Nasty Plot']);
P('Kingdra', 230, 'Water/Dragon', [75, 95, 95, 95, 95, 85], ['Waterfall', 'Outrage', 'Iron Head', 'Dragon Dance']);
P('Tyranitar', 248, 'Rock/Dark', [100, 134, 110, 95, 100, 61], ['Stone Edge', 'Crunch', 'Earthquake', 'Dragon Dance']);
// Gen 3
P('Sceptile', 254, 'Grass', [70, 85, 65, 105, 85, 120], ['Leaf Storm', 'Giga Drain', 'Focus Blast', 'Dragon Pulse']);
P('Blaziken', 257, 'Fire/Fighting', [80, 120, 70, 110, 70, 80], ['Flare Blitz', 'Close Combat', 'Stone Edge', 'Swords Dance']);
P('Swampert', 260, 'Water/Ground', [100, 110, 90, 85, 90, 60], ['Waterfall', 'Earthquake', 'Ice Punch', 'Stone Edge']);
P('Ludicolo', 272, 'Water/Grass', [80, 70, 70, 90, 100, 70], ['Surf', 'Giga Drain', 'Ice Beam', 'Focus Blast']);
P('Gardevoir', 282, 'Psychic/Fairy', [68, 65, 65, 125, 115, 80], ['Moonblast', 'Psyshock', 'Focus Blast', 'Calm Mind']);
P('Breloom', 286, 'Grass/Fighting', [60, 130, 80, 60, 60, 70], ['Spore', 'Seed Bomb', 'Mach Punch', 'Drain Punch']);
P('Aggron', 306, 'Steel/Rock', [70, 110, 180, 60, 60, 50], ['Head Smash', 'Iron Head', 'Earthquake', 'Ice Punch']);
P('Wailord', 321, 'Water', [170, 90, 45, 90, 45, 60], ['Hydro Pump', 'Ice Beam', 'Surf', 'Toxic']);
P('Flygon', 330, 'Ground/Dragon', [80, 100, 80, 80, 80, 100], ['Earthquake', 'Outrage', 'Fire Punch', 'Dragon Dance']);
P('Whiscash', 340, 'Water/Ground', [110, 78, 73, 76, 71, 60], ['Waterfall', 'Earthquake', 'Stone Edge', 'Dragon Dance']);
P('Claydol', 344, 'Ground/Psychic', [60, 70, 105, 70, 120, 75], ['Earthquake', 'Psychic', 'Ice Beam', 'Shadow Ball']);
P('Cradily', 346, 'Rock/Grass', [86, 81, 97, 81, 107, 43], ['Giga Drain', 'Stone Edge', 'Recover', 'Toxic']);
P('Armaldo', 348, 'Rock/Bug', [75, 125, 100, 70, 80, 45], ['Stone Edge', 'X-Scissor', 'Earthquake', 'Swords Dance']);
P('Milotic', 350, 'Water', [95, 60, 79, 100, 125, 81], ['Scald', 'Ice Beam', 'Dragon Pulse', 'Recover']);
P('Absol', 359, 'Dark', [65, 130, 60, 75, 60, 75], ['Knock Off', 'Sucker Punch', 'Play Rough', 'Swords Dance']);
P('Salamence', 373, 'Dragon/Flying', [95, 135, 80, 110, 80, 100], ['Outrage', 'Earthquake', 'Fire Fang', 'Dragon Dance']);
P('Metagross', 376, 'Steel/Psychic', [80, 135, 130, 95, 90, 70], ['Meteor Mash', 'Zen Headbutt', 'Earthquake', 'Bullet Punch']);
// Gen 4
P('Torterra', 389, 'Grass/Ground', [95, 109, 105, 75, 85, 56], ['Wood Hammer', 'Earthquake', 'Stone Edge', 'Synthesis']);
P('Infernape', 392, 'Fire/Fighting', [76, 104, 71, 104, 71, 108], ['Flare Blitz', 'Close Combat', 'Mach Punch', 'Stone Edge']);
P('Empoleon', 395, 'Water/Steel', [84, 86, 88, 111, 101, 60], ['Surf', 'Flash Cannon', 'Ice Beam', 'Toxic']);
P('Staraptor', 398, 'Normal/Flying', [85, 120, 70, 50, 60, 100], ['Brave Bird', 'Double-Edge', 'Close Combat', 'Quick Attack']);
P('Luxray', 405, 'Electric', [80, 120, 79, 95, 79, 70], ['Wild Charge', 'Crunch', 'Ice Fang', 'Fire Fang']);
P('Roserade', 407, 'Grass/Poison', [60, 70, 65, 125, 105, 90], ['Leaf Storm', 'Sludge Bomb', 'Shadow Ball', 'Sleep Powder']);
P('Gastrodon', 423, 'Water/Ground', [111, 83, 68, 92, 82, 39], ['Scald', 'Earth Power', 'Ice Beam', 'Recover']);
P('Honchkrow', 430, 'Dark/Flying', [100, 125, 52, 105, 52, 71], ['Brave Bird', 'Sucker Punch', 'Night Slash', 'Heat Wave']);
P('Spiritomb', 442, 'Ghost/Dark', [50, 92, 108, 92, 108, 35], ['Shadow Ball', 'Dark Pulse', 'Will-O-Wisp', 'Calm Mind']);
P('Garchomp', 445, 'Dragon/Ground', [108, 130, 95, 80, 85, 102], ['Earthquake', 'Outrage', 'Stone Edge', 'Swords Dance']);
P('Lucario', 448, 'Fighting/Steel', [70, 110, 70, 115, 70, 90], ['Aura Sphere', 'Flash Cannon', 'Dark Pulse', 'Nasty Plot']);
P('Abomasnow', 460, 'Grass/Ice', [90, 92, 75, 92, 85, 60], ['Blizzard', 'Energy Ball', 'Ice Shard', 'Earthquake']);
P('Weavile', 461, 'Dark/Ice', [70, 120, 65, 45, 85, 125], ['Knock Off', 'Icicle Crash', 'Ice Shard', 'Swords Dance']);
P('Magnezone', 462, 'Electric/Steel', [70, 70, 115, 130, 90, 60], ['Thunderbolt', 'Flash Cannon', 'Tri Attack', 'Thunder Wave']);
P('Rhyperior', 464, 'Ground/Rock', [115, 140, 130, 55, 55, 40], ['Earthquake', 'Stone Edge', 'Megahorn', 'Ice Punch']);
P('Electivire', 466, 'Electric', [75, 123, 67, 95, 85, 95], ['Wild Charge', 'Ice Punch', 'Earthquake', 'Flamethrower']);
P('Magmortar', 467, 'Fire', [75, 95, 67, 125, 95, 83], ['Fire Blast', 'Thunderbolt', 'Focus Blast', 'Psychic']);
P('Togekiss', 468, 'Fairy/Flying', [85, 50, 95, 120, 115, 80], ['Air Slash', 'Dazzling Gleam', 'Nasty Plot', 'Roost']);
P('Gliscor', 472, 'Ground/Flying', [75, 95, 125, 45, 75, 95], ['Earthquake', 'Knock Off', 'Roost', 'Swords Dance']);
P('Mamoswine', 473, 'Ice/Ground', [110, 130, 80, 70, 60, 80], ['Earthquake', 'Icicle Crash', 'Ice Shard', 'Stone Edge']);
P('Gallade', 475, 'Psychic/Fighting', [68, 125, 65, 65, 115, 80], ['Psycho Cut', 'Close Combat', 'Leaf Blade', 'Swords Dance']);
// Gen 5
P('Emboar', 500, 'Fire/Fighting', [110, 123, 65, 100, 65, 65], ['Flare Blitz', 'Superpower', 'Wild Charge', 'Head Smash']);
P('Samurott', 503, 'Water', [95, 100, 85, 108, 70, 70], ['Hydro Pump', 'Ice Beam', 'Megahorn', 'Aqua Jet']);
P('Gigalith', 526, 'Rock', [85, 135, 130, 60, 80, 25], ['Stone Edge', 'Earthquake', 'Superpower', 'Toxic']);
P('Excadrill', 530, 'Ground/Steel', [110, 135, 60, 50, 65, 88], ['Earthquake', 'Iron Head', 'Rock Slide', 'Swords Dance']);
P('Conkeldurr', 534, 'Fighting', [105, 140, 95, 55, 65, 45], ['Drain Punch', 'Mach Punch', 'Knock Off', 'Ice Punch']);
P('Seismitoad', 537, 'Water/Ground', [105, 95, 75, 85, 75, 74], ['Hydro Pump', 'Earth Power', 'Sludge Wave', 'Focus Blast']);
P('Krookodile', 553, 'Ground/Dark', [95, 117, 80, 65, 70, 92], ['Earthquake', 'Knock Off', 'Stone Edge', 'Superpower']);
P('Cofagrigus', 563, 'Ghost', [58, 50, 145, 95, 105, 30], ['Shadow Ball', 'Energy Ball', 'Will-O-Wisp', 'Nasty Plot']);
P('Archeops', 567, 'Rock/Flying', [75, 140, 65, 112, 65, 110], ['Head Smash', 'Acrobatics', 'Earthquake', 'Dragon Claw']);
P('Zoroark', 571, 'Dark', [60, 105, 60, 120, 60, 105], ['Dark Pulse', 'Flamethrower', 'Focus Blast', 'Nasty Plot']);
P('Eelektross', 604, 'Electric', [85, 115, 80, 105, 80, 50], ['Wild Charge', 'Drain Punch', 'Knock Off', 'Flamethrower']);
P('Chandelure', 609, 'Ghost/Fire', [60, 55, 90, 145, 90, 80], ['Shadow Ball', 'Fire Blast', 'Energy Ball', 'Calm Mind']);
P('Haxorus', 612, 'Dragon', [76, 147, 90, 60, 70, 97], ['Outrage', 'Earthquake', 'Poison Jab', 'Dragon Dance']);
P('Mienshao', 620, 'Fighting', [65, 125, 60, 95, 60, 105], ['High Jump Kick', 'Knock Off', 'Stone Edge', 'Poison Jab']);
P('Druddigon', 621, 'Dragon', [77, 120, 90, 60, 90, 48], ['Outrage', 'Earthquake', 'Fire Punch', 'Sucker Punch']);
P('Bisharp', 625, 'Dark/Steel', [65, 125, 100, 60, 70, 70], ['Knock Off', 'Iron Head', 'Sucker Punch', 'Swords Dance']);
P('Bouffalant', 626, 'Normal', [95, 110, 95, 40, 95, 55], ['Head Charge', 'Earthquake', 'Megahorn', 'Swords Dance']);
P('Braviary', 628, 'Normal/Flying', [100, 123, 75, 57, 75, 80], ['Brave Bird', 'Close Combat', 'Return', 'Bulk Up']);
P('Hydreigon', 635, 'Dark/Dragon', [92, 105, 90, 125, 90, 98], ['Dark Pulse', 'Draco Meteor', 'Flamethrower', 'Nasty Plot']);
P('Volcarona', 637, 'Bug/Fire', [85, 60, 65, 135, 105, 100], ['Flamethrower', 'Bug Buzz', 'Giga Drain', 'Quiver Dance']);
P('Zekrom', 644, 'Dragon/Electric', [100, 150, 120, 120, 100, 90], ['Bolt Strike', 'Outrage', 'Crunch', 'Dragon Dance'], true);
// Gen 6
P('Greninja', 658, 'Water/Dark', [72, 95, 67, 103, 71, 122], ['Hydro Pump', 'Dark Pulse', 'Ice Beam', 'Grass Knot']);
P('Talonflame', 663, 'Fire/Flying', [78, 81, 71, 74, 69, 126], ['Brave Bird', 'Flare Blitz', 'Swords Dance', 'Roost']);
P('Pyroar', 668, 'Fire/Normal', [86, 68, 72, 109, 66, 106], ['Flamethrower', 'Hyper Voice', 'Dark Pulse', 'Will-O-Wisp']);
P('Gogoat', 673, 'Grass', [123, 100, 62, 97, 81, 68], ['Horn Leech', 'Earthquake', 'Milk Drink', 'Bulk Up']);
P('Tyrantrum', 697, 'Rock/Dragon', [82, 121, 119, 69, 59, 71], ['Head Smash', 'Outrage', 'Earthquake', 'Dragon Dance']);
P('Aurorus', 699, 'Rock/Ice', [123, 77, 72, 99, 92, 58], ['Freeze-Dry', 'Earth Power', 'Thunderbolt', 'Calm Mind']);
P('Sylveon', 700, 'Fairy', [95, 65, 65, 110, 130, 60], ['Moonblast', 'Psyshock', 'Shadow Ball', 'Calm Mind']);
P('Hawlucha', 701, 'Fighting/Flying', [78, 92, 75, 74, 63, 118], ['Close Combat', 'Acrobatics', 'Swords Dance', 'Roost']);
P('Goodra', 706, 'Dragon', [90, 100, 70, 110, 150, 80], ['Draco Meteor', 'Flamethrower', 'Sludge Bomb', 'Thunderbolt']);
P('Gourgeist', 711, 'Ghost/Grass', [65, 90, 122, 58, 75, 84], ['Phantom Force', 'Seed Bomb', 'Shadow Sneak', 'Will-O-Wisp']);
P('Avalugg', 713, 'Ice', [95, 117, 184, 44, 46, 28], ['Icicle Crash', 'Earthquake', 'Recover', 'Toxic']);
P('Yveltal', 717, 'Dark/Flying', [126, 131, 95, 131, 98, 99], ['Oblivion Wing', 'Dark Pulse', 'Focus Blast', 'Sucker Punch'], true);
// Gen 7
P('Incineroar', 727, 'Fire/Dark', [95, 115, 90, 80, 90, 60], ['Flare Blitz', 'Darkest Lariat', 'Close Combat', 'Swords Dance']);
P('Primarina', 730, 'Water/Fairy', [80, 74, 74, 126, 116, 60], ['Surf', 'Moonblast', 'Ice Beam', 'Calm Mind']);
P('Lycanroc', 745, 'Rock', [75, 115, 65, 55, 65, 112], ['Stone Edge', 'Accelerock', 'Crunch', 'Swords Dance']);
P('Mimikyu', 778, 'Ghost/Fairy', [55, 90, 80, 50, 105, 96], ['Play Rough', 'Shadow Claw', 'Shadow Sneak', 'Swords Dance']);
P('Kommo-o', 784, 'Dragon/Fighting', [75, 110, 125, 100, 105, 85], ['Close Combat', 'Outrage', 'Poison Jab', 'Dragon Dance']);
// Gen 8
P('Rillaboom', 812, 'Grass', [100, 125, 90, 60, 70, 85], ['Wood Hammer', 'Grassy Glide', 'Knock Off', 'High Horsepower']);
P('Cinderace', 815, 'Fire', [80, 116, 75, 65, 75, 119], ['Pyro Ball', 'High Jump Kick', 'Sucker Punch', 'Gunk Shot']);
P('Inteleon', 818, 'Water', [70, 85, 65, 125, 65, 120], ['Hydro Pump', 'Ice Beam', 'Dark Pulse', 'Air Slash']);
P('Corviknight', 823, 'Flying/Steel', [98, 87, 105, 53, 85, 67], ['Brave Bird', 'Iron Head', 'Roost', 'Bulk Up']);
P('Sandaconda', 844, 'Ground', [72, 107, 125, 65, 70, 71], ['Earthquake', 'Stone Edge', 'Glare', 'Coil']);
P('Duraludon', 884, 'Steel/Dragon', [70, 95, 115, 120, 50, 85], ['Draco Meteor', 'Flash Cannon', 'Thunderbolt', 'Dark Pulse']);
P('Dragapult', 887, 'Dragon/Ghost', [88, 120, 75, 100, 75, 142], ['Dragon Darts', 'Shadow Ball', 'Flamethrower', 'Thunderbolt']);
// Gen 9
P('Meowscarada', 908, 'Grass/Dark', [76, 110, 70, 81, 70, 123], ['Flower Trick', 'Knock Off', 'Play Rough', 'Sucker Punch']);
P('Skeledirge', 911, 'Fire/Ghost', [104, 75, 100, 110, 75, 66], ['Torch Song', 'Shadow Ball', 'Slack Off', 'Will-O-Wisp']);
P('Quaquaval', 914, 'Water/Fighting', [85, 120, 80, 85, 75, 85], ['Aqua Step', 'Close Combat', 'Knock Off', 'Roost']);
P('Espathra', 956, 'Psychic', [95, 60, 60, 101, 60, 105], ['Lumina Crash', 'Dazzling Gleam', 'Shadow Ball', 'Calm Mind']);
P('Glimmora', 970, 'Rock/Poison', [83, 55, 90, 130, 81, 86], ['Power Gem', 'Sludge Wave', 'Earth Power', 'Dazzling Gleam']);
P('Veluza', 976, 'Water/Psychic', [90, 102, 73, 78, 65, 70], ['Liquidation', 'Psycho Cut', 'Aqua Jet', 'Night Slash']);
P('Kingambit', 983, 'Dark/Steel', [100, 135, 120, 60, 85, 50], ['Kowtow Cleave', 'Iron Head', 'Sucker Punch', 'Swords Dance']);
P('Baxcalibur', 998, 'Dragon/Ice', [115, 145, 92, 75, 86, 87], ['Icicle Crash', 'Outrage', 'Ice Shard', 'Dragon Dance']);
P('Gholdengo', 1000, 'Steel/Ghost', [87, 60, 95, 133, 91, 84], ['Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Recover']);

// ---------- Expansion pack ----------
// Gen 1
P('Sandslash', 28, 'Ground', [75, 100, 110, 45, 55, 65], ['Earthquake', 'Stone Edge', 'Knock Off', 'Swords Dance']);
P('Primeape', 57, 'Fighting', [65, 105, 60, 60, 70, 95], ['Close Combat', 'Stone Edge', 'Ice Punch', 'Bulk Up']);
P('Dodrio', 85, 'Normal/Flying', [60, 110, 70, 60, 60, 110], ['Brave Bird', 'Double-Edge', 'Knock Off', 'Swords Dance']);
P('Kingler', 99, 'Water', [55, 130, 115, 50, 50, 75], ['Crabhammer', 'Knock Off', 'X-Scissor', 'Swords Dance']);
P('Electrode', 101, 'Electric', [60, 50, 70, 80, 80, 150], ['Thunderbolt', 'Discharge', 'Thunder Wave', 'Signal Beam']);
P('Hitmonchan', 107, 'Fighting', [50, 105, 79, 35, 110, 76], ['Drain Punch', 'Mach Punch', 'Ice Punch', 'Bulk Up']);
P('Weezing', 110, 'Poison', [65, 90, 120, 85, 70, 60], ['Sludge Bomb', 'Flamethrower', 'Dark Pulse', 'Will-O-Wisp']);
P('Mr. Mime', 122, 'Psychic/Fairy', [40, 45, 65, 100, 120, 90], ['Psychic', 'Dazzling Gleam', 'Focus Blast', 'Nasty Plot']);
P('Scyther', 123, 'Bug/Flying', [70, 110, 80, 55, 80, 105], ['X-Scissor', 'Acrobatics', 'Knock Off', 'Swords Dance']);
P('Pinsir', 127, 'Bug', [65, 125, 100, 55, 70, 85], ['X-Scissor', 'Close Combat', 'Stone Edge', 'Swords Dance']);
P('Flareon', 136, 'Fire', [65, 130, 60, 95, 110, 65], ['Flare Blitz', 'Superpower', 'Double-Edge', 'Quick Attack']);
P('Omastar', 139, 'Rock/Water', [70, 60, 125, 115, 70, 55], ['Hydro Pump', 'Ice Beam', 'Earth Power', 'Shell Smash']);
P('Kabutops', 141, 'Rock/Water', [60, 115, 105, 65, 70, 80], ['Stone Edge', 'Waterfall', 'Aqua Jet', 'Swords Dance']);
// Gen 2
P('Bellossom', 182, 'Grass', [75, 80, 95, 90, 100, 50], ['Giga Drain', 'Moonblast', 'Sleep Powder', 'Quiver Dance']);
P('Quagsire', 195, 'Water/Ground', [95, 85, 85, 65, 65, 35], ['Earthquake', 'Liquidation', 'Recover', 'Toxic']);
P('Ursaring', 217, 'Normal', [90, 130, 75, 75, 75, 55], ['Return', 'Close Combat', 'Crunch', 'Swords Dance']);
P('Donphan', 232, 'Ground', [90, 120, 120, 60, 60, 50], ['Earthquake', 'Ice Shard', 'Knock Off', 'Gunk Shot']);
// Gen 3
P('Mightyena', 262, 'Dark', [70, 90, 70, 60, 60, 70], ['Crunch', 'Sucker Punch', 'Play Rough', 'Fire Fang']);
P('Exploud', 295, 'Normal', [104, 91, 63, 91, 73, 68], ['Boomburst', 'Flamethrower', 'Focus Blast', 'Ice Beam']);
P('Sharpedo', 319, 'Water/Dark', [70, 120, 40, 95, 40, 95], ['Liquidation', 'Crunch', 'Ice Fang', 'Aqua Jet']);
P('Camerupt', 323, 'Fire/Ground', [70, 100, 70, 105, 75, 40], ['Flamethrower', 'Earth Power', 'Will-O-Wisp', 'Toxic']);
P('Altaria', 334, 'Dragon/Flying', [75, 70, 90, 70, 105, 80], ['Draco Meteor', 'Flamethrower', 'Moonblast', 'Roost']);
P('Crawdaunt', 342, 'Water/Dark', [63, 120, 85, 90, 55, 55], ['Crabhammer', 'Knock Off', 'Aqua Jet', 'Swords Dance']);
P('Walrein', 365, 'Ice/Water', [110, 80, 90, 95, 90, 65], ['Ice Beam', 'Surf', 'Earthquake', 'Toxic']);
P('Kyogre', 382, 'Water', [100, 100, 90, 150, 140, 90], ['Hydro Pump', 'Ice Beam', 'Thunder', 'Calm Mind'], true);
P('Groudon', 383, 'Ground', [100, 150, 140, 100, 90, 90], ['Earthquake', 'Stone Edge', 'Fire Punch', 'Swords Dance'], true);
// Gen 4
P('Mismagius', 429, 'Ghost', [60, 60, 60, 105, 105, 105], ['Shadow Ball', 'Dazzling Gleam', 'Thunderbolt', 'Nasty Plot']);
P('Bronzong', 437, 'Steel/Psychic', [67, 89, 116, 79, 116, 33], ['Iron Head', 'Earthquake', 'Psychic', 'Toxic']);
P('Hippowdon', 450, 'Ground', [108, 112, 118, 68, 72, 47], ['Earthquake', 'Stone Edge', 'Slack Off', 'Toxic']);
P('Drapion', 452, 'Poison/Dark', [70, 90, 110, 60, 75, 95], ['Knock Off', 'Poison Jab', 'Earthquake', 'Swords Dance']);
P('Toxicroak', 454, 'Poison/Fighting', [83, 106, 65, 86, 65, 85], ['Drain Punch', 'Gunk Shot', 'Sucker Punch', 'Swords Dance']);
P('Tangrowth', 465, 'Grass', [100, 100, 125, 110, 50, 50], ['Giga Drain', 'Earthquake', 'Knock Off', 'Sleep Powder']);
P('Leafeon', 470, 'Grass', [65, 110, 130, 60, 65, 95], ['Leaf Blade', 'Knock Off', 'Double-Edge', 'Swords Dance']);
P('Glaceon', 471, 'Ice', [65, 60, 110, 130, 95, 65], ['Ice Beam', 'Freeze-Dry', 'Shadow Ball', 'Calm Mind']);
P('Porygon-Z', 474, 'Normal', [85, 80, 70, 135, 75, 90], ['Tri Attack', 'Thunderbolt', 'Ice Beam', 'Nasty Plot']);
P('Dusknoir', 477, 'Ghost', [45, 100, 135, 65, 135, 45], ['Poltergeist', 'Shadow Sneak', 'Ice Punch', 'Earthquake']);
P('Froslass', 478, 'Ice/Ghost', [70, 80, 70, 80, 70, 110], ['Ice Beam', 'Shadow Ball', 'Thunderbolt', 'Will-O-Wisp']);
P('Giratina', 487, 'Ghost/Dragon', [150, 100, 120, 100, 120, 90], ['Shadow Ball', 'Dragon Pulse', 'Aura Sphere', 'Will-O-Wisp'], true);
P('Darkrai', 491, 'Dark', [70, 90, 90, 135, 90, 125], ['Dark Pulse', 'Sludge Bomb', 'Hypnosis', 'Nasty Plot'], true);
// Gen 5
P('Liepard', 510, 'Dark', [64, 88, 50, 88, 50, 106], ['Knock Off', 'Play Rough', 'Sucker Punch', 'Nasty Plot']);
P('Lilligant', 549, 'Grass', [70, 60, 75, 110, 75, 90], ['Giga Drain', 'Energy Ball', 'Sleep Powder', 'Quiver Dance']);
P('Scrafty', 560, 'Dark/Fighting', [65, 90, 115, 45, 115, 58], ['Drain Punch', 'Knock Off', 'Ice Punch', 'Bulk Up']);
P('Carracosta', 565, 'Water/Rock', [74, 108, 133, 83, 65, 32], ['Liquidation', 'Stone Edge', 'Aqua Jet', 'Shell Smash']);
P('Reuniclus', 579, 'Psychic', [110, 65, 75, 125, 85, 30], ['Psyshock', 'Focus Blast', 'Recover', 'Calm Mind']);
P('Vanilluxe', 584, 'Ice', [71, 95, 85, 110, 95, 79], ['Ice Beam', 'Freeze-Dry', 'Flash Cannon', 'Toxic']);
P('Escavalier', 589, 'Bug/Steel', [70, 135, 105, 60, 105, 20], ['Megahorn', 'Iron Head', 'Knock Off', 'Swords Dance']);
P('Jellicent', 593, 'Water/Ghost', [100, 60, 70, 85, 105, 60], ['Scald', 'Shadow Ball', 'Will-O-Wisp', 'Recover']);
P('Galvantula', 596, 'Bug/Electric', [70, 77, 60, 97, 60, 108], ['Thunder', 'Bug Buzz', 'Giga Drain', 'Thunder Wave']);
P('Ferrothorn', 598, 'Grass/Steel', [74, 94, 131, 54, 116, 20], ['Power Whip', 'Iron Head', 'Knock Off', 'Toxic']);
P('Klinklang', 601, 'Steel', [60, 100, 115, 70, 85, 90], ['Gear Grind', 'Wild Charge', 'Return', 'Shift Gear']);
P('Accelgor', 617, 'Bug', [80, 70, 40, 100, 60, 145], ['Bug Buzz', 'Focus Blast', 'Energy Ball', 'Sludge Bomb']);
P('Golurk', 623, 'Ground/Ghost', [89, 124, 80, 55, 80, 55], ['Earthquake', 'Poltergeist', 'Ice Punch', 'Stone Edge']);
// Gen 6
P('Chesnaught', 652, 'Grass/Fighting', [88, 107, 122, 74, 75, 64], ['Wood Hammer', 'Drain Punch', 'Stone Edge', 'Bulk Up']);
P('Delphox', 655, 'Fire/Psychic', [75, 69, 72, 114, 100, 104], ['Flamethrower', 'Psychic', 'Grass Knot', 'Calm Mind']);
P('Florges', 671, 'Fairy', [78, 65, 68, 112, 154, 75], ['Moonblast', 'Psychic', 'Synthesis', 'Calm Mind']);
P('Dragalge', 691, 'Poison/Dragon', [65, 75, 90, 97, 123, 44], ['Sludge Bomb', 'Draco Meteor', 'Focus Blast', 'Toxic']);
P('Clawitzer', 693, 'Water', [71, 73, 88, 120, 89, 59], ['Surf', 'Dark Pulse', 'Aura Sphere', 'Ice Beam']);
P('Trevenant', 709, 'Ghost/Grass', [85, 110, 76, 65, 82, 56], ['Wood Hammer', 'Poltergeist', 'Shadow Claw', 'Will-O-Wisp']);
P('Noivern', 715, 'Flying/Dragon', [85, 70, 80, 97, 80, 123], ['Draco Meteor', 'Hurricane', 'Boomburst', 'Roost']);
// Gen 7
P('Decidueye', 724, 'Grass/Ghost', [78, 107, 75, 100, 100, 70], ['Leaf Blade', 'Poltergeist', 'Shadow Sneak', 'Swords Dance']);
P('Vikavolt', 738, 'Bug/Electric', [77, 70, 90, 145, 75, 43], ['Thunderbolt', 'Bug Buzz', 'Energy Ball', 'Flash Cannon']);
P('Mudsdale', 750, 'Ground', [100, 125, 100, 55, 85, 35], ['High Horsepower', 'Close Combat', 'Stone Edge', 'Iron Head']);
P('Salazzle', 758, 'Poison/Fire', [68, 64, 60, 111, 60, 117], ['Flamethrower', 'Sludge Wave', 'Dragon Pulse', 'Nasty Plot']);
P('Bewear', 760, 'Normal/Fighting', [120, 125, 80, 55, 60, 60], ['Double-Edge', 'Close Combat', 'Drain Punch', 'Swords Dance']);
P('Tsareena', 763, 'Grass', [72, 120, 98, 50, 98, 72], ['Power Whip', 'High Jump Kick', 'Knock Off', 'Play Rough']);
P('Golisopod', 768, 'Bug/Water', [75, 125, 140, 60, 90, 40], ['Liquidation', 'Leech Life', 'Knock Off', 'Aqua Jet']);
// Gen 8
P('Barraskewda', 847, 'Water', [61, 123, 60, 60, 50, 136], ['Liquidation', 'Close Combat', 'Psychic Fangs', 'Aqua Jet']);
P('Toxtricity', 849, 'Electric/Poison', [75, 98, 70, 114, 70, 75], ['Thunderbolt', 'Sludge Wave', 'Boomburst', 'Shift Gear']);
P('Hatterene', 858, 'Psychic/Fairy', [57, 90, 95, 136, 103, 29], ['Psychic', 'Dazzling Gleam', 'Shadow Ball', 'Calm Mind']);
P('Grimmsnarl', 861, 'Dark/Fairy', [95, 120, 65, 95, 75, 60], ['Spirit Break', 'Darkest Lariat', 'Sucker Punch', 'Bulk Up']);
P('Copperajah', 879, 'Steel', [122, 130, 69, 80, 69, 30], ['Iron Head', 'Play Rough', 'High Horsepower', 'Superpower']);
// Gen 9
P('Pawmot', 923, 'Electric/Fighting', [70, 115, 70, 70, 60, 105], ['Wild Charge', 'Close Combat', 'Mach Punch', 'Ice Punch']);
P('Garganacl', 934, 'Rock', [100, 100, 130, 45, 90, 35], ['Stone Edge', 'Earthquake', 'Recover', 'Curse']);
P('Armarouge', 936, 'Fire/Psychic', [85, 60, 100, 125, 80, 75], ['Armor Cannon', 'Psyshock', 'Energy Ball', 'Calm Mind']);
P('Ceruledge', 937, 'Fire/Ghost', [75, 125, 80, 60, 100, 85], ['Bitter Blade', 'Shadow Claw', 'Shadow Sneak', 'Swords Dance']);
P('Mabosstiff', 943, 'Dark', [80, 120, 90, 60, 70, 85], ['Crunch', 'Play Rough', 'Wild Charge', 'Psychic Fangs']);
P('Orthworm', 968, 'Steel', [70, 85, 145, 60, 55, 65], ['Iron Head', 'Earthquake', 'Rock Slide', 'Coil']);
P('Dondozo', 977, 'Water', [150, 100, 115, 65, 65, 35], ['Wave Crash', 'Earthquake', 'Crunch', 'Curse']);
P('Clodsire', 980, 'Poison/Ground', [130, 75, 60, 45, 100, 20], ['Earthquake', 'Poison Jab', 'Recover', 'Toxic']);
P('Dudunsparce', 982, 'Normal', [125, 100, 80, 85, 75, 55], ['Hyper Voice', 'Earth Power', 'Shadow Ball', 'Calm Mind']);

// ---------- Bosses (rotate daily) ----------
// sprite = Pokémon Showdown trainer sprite name (defaults to key)
const BOSSES = [
  { key: 'red', name: 'Red', title: 'Pokémon Trainer', place: 'Mt. Silver', region: 'Kanto', color: '#d7263d',
    quote: '…', team: ['Pikachu', 'Espeon', 'Snorlax', 'Venusaur', 'Charizard', 'Blastoise'] },
  { key: 'blue', name: 'Blue', title: 'Gym Leader', place: 'Viridian Gym', region: 'Kanto', color: '#3a6ea5',
    quote: "Smell ya later! …Or not. Let's see what you've got.", team: ['Pidgeot', 'Alakazam', 'Rhydon', 'Gyarados', 'Arcanine', 'Exeggutor'] },
  { key: 'giovanni', name: 'Giovanni', title: 'Team Rocket Boss', place: 'Viridian Gym', region: 'Kanto', color: '#6b4f2a',
    quote: 'You dare stand against Team Rocket? Then you will know true power.', team: ['Persian', 'Dugtrio', 'Nidoqueen', 'Nidoking', 'Kangaskhan', 'Rhyperior'] },
  { key: 'lance', name: 'Lance', title: 'Dragon Master', place: 'Indigo Plateau', region: 'Johto', color: '#b0302b',
    quote: 'Dragons are mystical Pokémon. They are hard to catch and raise, but their power is superior.', team: ['Gyarados', 'Aerodactyl', 'Charizard', 'Kingdra', 'Salamence', 'Dragonite'] },
  { key: 'karen', name: 'Karen', title: 'Elite Four', place: 'Indigo Plateau', region: 'Johto', color: '#4a3b5c',
    quote: 'Strong Pokémon. Weak Pokémon. That is only the selfish perception of people.', team: ['Umbreon', 'Vileplume', 'Gengar', 'Honchkrow', 'Houndoom', 'Weavile'] },
  { key: 'steven', name: 'Steven', title: 'Champion', place: 'Ever Grande City', region: 'Hoenn', color: '#5b6f8a',
    quote: 'I, the Champion, fall in defeat… Kidding. Show me your bond with your Pokémon.', team: ['Skarmory', 'Claydol', 'Aggron', 'Cradily', 'Armaldo', 'Metagross'] },
  { key: 'wallace', name: 'Wallace', title: 'Champion', place: 'Ever Grande City', region: 'Hoenn', color: '#2f8fb3',
    quote: 'Allow me to present to you a performance of illusions in water!', team: ['Wailord', 'Tentacruel', 'Ludicolo', 'Whiscash', 'Gyarados', 'Milotic'] },
  { key: 'cynthia', name: 'Cynthia', title: 'Champion', place: 'Pokémon League', region: 'Sinnoh', color: '#2b2b2b',
    quote: 'Just a moment, please. I want to battle you with everything I have.', team: ['Spiritomb', 'Roserade', 'Gastrodon', 'Lucario', 'Milotic', 'Garchomp'] },
  { key: 'volkner', name: 'Volkner', title: 'Gym Leader', place: 'Sunyshore Gym', region: 'Sinnoh', color: '#d9b322',
    quote: "Finally, a challenger who might give me a shock. Don't disappoint me.", team: ['Raichu', 'Jolteon', 'Ampharos', 'Luxray', 'Magnezone', 'Electivire'] },
  { key: 'iris', name: 'Iris', title: 'Champion', place: 'Pokémon League', region: 'Unova', color: '#7b3fa0',
    quote: "I'm Iris, the Champion! Let's have a battle full of fun!", team: ['Hydreigon', 'Druddigon', 'Archeops', 'Aggron', 'Lapras', 'Haxorus'] },
  { key: 'ghetsis', name: 'Ghetsis', title: 'Team Plasma', place: "N's Castle", region: 'Unova', color: '#3e5f3a',
    quote: 'I will crush you and your hope beneath my heel!', team: ['Cofagrigus', 'Bouffalant', 'Seismitoad', 'Bisharp', 'Eelektross', 'Hydreigon'] },
  { key: 'diantha', name: 'Diantha', title: 'Champion', place: 'Pokémon League', region: 'Kalos', color: '#c9497a',
    quote: 'Witnessing the noble spirits of you and your Pokémon in battle really touches my heart.', team: ['Hawlucha', 'Tyrantrum', 'Aurorus', 'Gourgeist', 'Goodra', 'Gardevoir'] },
  { key: 'lysandre', name: 'Lysandre', title: 'Team Flare Boss', place: 'Lysandre Labs', region: 'Kalos', color: '#c4361c',
    quote: 'The world will be beautiful. And you will not be in it.', team: ['Mienshao', 'Honchkrow', 'Pyroar', 'Gyarados', 'Weavile', 'Yveltal'] },
  { key: 'kukui', name: 'Kukui', title: 'Champion', place: 'Mount Lanakila', region: 'Alola', color: '#d3812a',
    quote: "Woo! Let's make this battle one for the ages, cousin!", team: ['Lycanroc', 'Ninetales-Alola', 'Braviary', 'Magnezone', 'Snorlax', 'Incineroar'] },
  { key: 'leon', name: 'Leon', title: 'Champion', place: 'Wyndon Stadium', region: 'Galar', color: '#7a1f3d',
    quote: "Let's have a champion time!", team: ['Dragapult', 'Haxorus', 'Seismitoad', 'Rhyperior', 'Cinderace', 'Charizard'] },
  { key: 'raihan', name: 'Raihan', title: 'Gym Leader', place: 'Hammerlocke Gym', region: 'Galar', color: '#2d6a6a',
    quote: "I'm gonna beat you and show everyone how strong I am!", team: ['Flygon', 'Gigalith', 'Sandaconda', 'Kommo-o', 'Goodra', 'Duraludon'] },
  { key: 'geeta', name: 'Geeta', title: 'Top Champion', place: 'Pokémon League', region: 'Paldea', color: '#3a3f6b',
    quote: 'Show me the strength you have gained on your journey.', team: ['Espathra', 'Gogoat', 'Veluza', 'Avalugg', 'Glimmora', 'Kingambit'] },

  // ----- Expansion: gym leaders, villains, rivals -----
  { key: 'brock', name: 'Brock', title: 'Gym Leader', place: 'Pewter Gym', region: 'Kanto', color: '#8a6d3b',
    quote: "Rock-solid defense wins battles. Let's see you crack it.", team: ['Golem', 'Steelix', 'Kabutops', 'Omastar', 'Aerodactyl', 'Rhyperior'] },
  { key: 'misty', name: 'Misty', title: 'Gym Leader', place: 'Cerulean Gym', region: 'Kanto', color: '#3b8fd1',
    quote: 'Ready to get soaked? I go all-out with Water types!', team: ['Golduck', 'Vaporeon', 'Cloyster', 'Lapras', 'Gyarados', 'Starmie'] },
  { key: 'ltsurge', name: 'Lt. Surge', title: 'Gym Leader', place: 'Vermilion Gym', region: 'Kanto', color: '#c9a227',
    quote: "Hey, kid! My Electric Pokémon pack a real jolt. Hope you're grounded!", team: ['Electrode', 'Jolteon', 'Electivire', 'Magnezone', 'Raichu', 'Zapdos'] },
  { key: 'erika', name: 'Erika', title: 'Gym Leader', place: 'Celadon Gym', region: 'Kanto', color: '#5aa35a',
    quote: 'Oh, a challenger… Please, let my flowers show you their strength.', team: ['Bellossom', 'Victreebel', 'Tangrowth', 'Vileplume', 'Roserade', 'Venusaur'] },
  { key: 'sabrina', name: 'Sabrina', title: 'Gym Leader', place: 'Saffron Gym', region: 'Kanto', color: '#a3477a',
    quote: 'I foresaw your arrival. I also foresaw how this ends.', team: ['Mr. Mime', 'Slowbro', 'Exeggutor', 'Espeon', 'Gardevoir', 'Alakazam'] },
  { key: 'blaine', name: 'Blaine', title: 'Gym Leader', place: 'Cinnabar Gym', region: 'Kanto', color: '#c4502b',
    quote: 'Hah! I hope you packed plenty of Burn Heals!', team: ['Rapidash', 'Ninetales', 'Houndoom', 'Magmortar', 'Arcanine', 'Moltres'] },
  { key: 'silver', name: 'Silver', title: 'Rival', place: 'Indigo Plateau', region: 'Johto', color: '#8b1e2e',
    quote: "I only want strong Pokémon. Let's see if yours measure up.", team: ['Weavile', 'Crobat', 'Magnezone', 'Gengar', 'Alakazam', 'Feraligatr'] },
  { key: 'morty', name: 'Morty', title: 'Gym Leader', place: 'Ecruteak Gym', region: 'Johto', color: '#6b4f8a',
    quote: 'I have seen your future. It is full of fainted Pokémon.', team: ['Mismagius', 'Dusknoir', 'Cofagrigus', 'Spiritomb', 'Chandelure', 'Gengar'] },
  { key: 'wally', name: 'Wally', title: 'Rival', place: 'Victory Road', region: 'Hoenn', color: '#4f9a6a',
    quote: "I've gotten so much stronger since we met. I won't hold back!", team: ['Altaria', 'Roserade', 'Magnezone', 'Flygon', 'Gardevoir', 'Gallade'] },
  { key: 'maxie', sprite: 'maxie-gen6', name: 'Maxie', title: 'Team Magma Leader', place: 'Cave of Origin', region: 'Hoenn', color: '#b0302b',
    quote: 'More land for humanity! Nothing will stand in our way, least of all you.', team: ['Mightyena', 'Crobat', 'Weezing', 'Camerupt', 'Claydol', 'Groudon'] },
  { key: 'archie', sprite: 'archie-gen6', name: 'Archie', title: 'Team Aqua Leader', place: 'Seafloor Cavern', region: 'Hoenn', color: '#2b4f9a',
    quote: "The sea is the cradle of all life! You're about to get washed away!", team: ['Mightyena', 'Crobat', 'Muk', 'Tentacruel', 'Sharpedo', 'Kyogre'] },
  { key: 'cyrus', name: 'Cyrus', title: 'Team Galactic Boss', place: 'Spear Pillar', region: 'Sinnoh', color: '#3b4a7a',
    quote: 'Emotion is weakness. I will show you a world without it.', team: ['Houndoom', 'Honchkrow', 'Crobat', 'Gyarados', 'Weavile', 'Darkrai'] },
  { key: 'flint', name: 'Flint', title: 'Elite Four', place: 'Pokémon League', region: 'Sinnoh', color: '#e0562b',
    quote: "Let's get fired up! Burn bright or burn out!", team: ['Flareon', 'Rapidash', 'Houndoom', 'Magmortar', 'Arcanine', 'Infernape'] },
  { key: 'volo', name: 'Volo', title: 'Ginkgo Guild', place: 'Temple of Sinnoh', region: 'Hisui', color: '#b8a26a',
    quote: 'Oh, I am so glad you came. Now… let us see what you are truly made of.', team: ['Roserade', 'Togekiss', 'Arcanine-Hisui', 'Lucario', 'Garchomp', 'Giratina-Origin'] },
  { key: 'alder', name: 'Alder', title: 'Champion', place: 'Pokémon League', region: 'Unova', color: '#b4532b',
    quote: "Battling is about the bonds you share. Let's feel the heat!", team: ['Accelgor', 'Bouffalant', 'Druddigon', 'Vanilluxe', 'Escavalier', 'Volcarona'] },
  { key: 'n', name: 'N', title: 'King of Team Plasma', place: "N's Castle", region: 'Unova', color: '#4b8a5a',
    quote: 'Let me hear the voices of your Pokémon. Are they truly happy with you?', team: ['Zoroark', 'Carracosta', 'Vanilluxe', 'Archeops', 'Klinklang', 'Zekrom'] },
  { key: 'guzma', name: 'Guzma', title: 'Team Skull Boss', place: 'Aether Paradise', region: 'Alola', color: '#6a6a6a',
    quote: "Guzma is the hard-to-beat boss who'll beat you down every time!", team: ['Pinsir', 'Vikavolt', 'Heracross', 'Scizor', 'Armaldo', 'Golisopod'] },
  { key: 'marnie', name: 'Marnie', title: 'Gym Leader', place: 'Spikemuth Gym', region: 'Galar', color: '#c93e7a',
    quote: "Don't expect me to go easy on you. Spikemuth's counting on me.", team: ['Liepard', 'Toxicroak', 'Scrafty', 'Krookodile', 'Absol', 'Grimmsnarl'] },
  { key: 'rose', name: 'Rose', title: 'Chairman', place: 'Rose Tower', region: 'Galar', color: '#3a6a9a',
    quote: 'For the next thousand years of Galar, I simply cannot let you win.', team: ['Copperajah', 'Ferrothorn', 'Escavalier', 'Klinklang', 'Corviknight', 'Duraludon'] },
  { key: 'hassel', name: 'Hassel', title: 'Elite Four', place: 'Pokémon League', region: 'Paldea', color: '#3a8a6a',
    quote: 'Let our battle be a masterpiece painted in dragon fire.', team: ['Noivern', 'Dragalge', 'Flygon', 'Haxorus', 'Goodra', 'Baxcalibur'] },
  { key: 'nemona', sprite: 'nemona-v', name: 'Nemona', title: 'Champion', place: 'Mesagoza', region: 'Paldea', color: '#d9a12b',
    quote: "Finally! I've been waiting ALL day to battle you for real!", team: ['Lycanroc', 'Goodra', 'Dudunsparce', 'Orthworm', 'Pawmot', 'Quaquaval'] },

  // ----- Expansion 2: Elite Four, gym leaders, bosses -----
  { key: 'lorelei', sprite: 'lorelei-lgpe', name: 'Lorelei', title: 'Elite Four', place: 'Indigo Plateau', region: 'Kanto', color: '#4a7fb5',
    quote: 'No one can best me when it comes to icy Pokémon. Care to try?', team: ['Dewgong', 'Cloyster', 'Jynx', 'Slowbro', 'Glaceon', 'Lapras'] },
  { key: 'bruno', name: 'Bruno', title: 'Elite Four', place: 'Indigo Plateau', region: 'Kanto', color: '#7a4a2a',
    quote: 'We will grind you down with our superior power! Hoo hah!', team: ['Hitmontop', 'Hitmonlee', 'Hitmonchan', 'Steelix', 'Conkeldurr', 'Machamp'] },
  { key: 'agatha', sprite: 'agatha-lgpe', name: 'Agatha', title: 'Elite Four', place: 'Indigo Plateau', region: 'Kanto', color: '#5a3f7a',
    quote: "Back in my day, trainers were tougher. Let's see how you hold up.", team: ['Arbok', 'Crobat', 'Mismagius', 'Dusknoir', 'Gourgeist', 'Gengar'] },
  { key: 'koga', name: 'Koga', title: 'Elite Four', place: 'Indigo Plateau', region: 'Johto', color: '#6a3a8a',
    quote: 'A ninja does not fight fair. Prepare to be poisoned and confounded!', team: ['Venomoth', 'Muk', 'Weezing', 'Drapion', 'Toxicroak', 'Crobat'] },
  { key: 'clair', name: 'Clair', title: 'Gym Leader', place: 'Blackthorn Gym', region: 'Johto', color: '#3a5ab0',
    quote: "I am the world's best dragon master. Don't make me laugh.", team: ['Altaria', 'Druddigon', 'Gyarados', 'Flygon', 'Dragonite', 'Kingdra'] },
  { key: 'whitney', name: 'Whitney', title: 'Gym Leader', place: 'Goldenrod Gym', region: 'Johto', color: '#e07aa8',
    quote: "Everyone was into Pokémon, so I got into it too! And now I'm super strong!", team: ['Clefable', 'Tauros', 'Ursaring', 'Kangaskhan', 'Snorlax', 'Miltank'] },
  { key: 'jasmine', name: 'Jasmine', title: 'Gym Leader', place: 'Olivine Gym', region: 'Johto', color: '#8a9ab0',
    quote: 'Um… I use the Steel type. Please don\'t go easy on me.', team: ['Magnezone', 'Skarmory', 'Bronzong', 'Scizor', 'Metagross', 'Steelix'] },
  { key: 'norman', name: 'Norman', title: 'Gym Leader', place: 'Petalburg Gym', region: 'Hoenn', color: '#a0703a',
    quote: "I won't hold back, even against you. A Gym Leader's pride is on the line.", team: ['Kangaskhan', 'Ursaring', 'Exploud', 'Porygon-Z', 'Staraptor', 'Slaking'] },
  { key: 'drake', sprite: 'drake-gen3', name: 'Drake', title: 'Elite Four', place: 'Ever Grande City', region: 'Hoenn', color: '#2f6a5a',
    quote: 'To battle with dragons, you need a heart that fears nothing.', team: ['Altaria', 'Flygon', 'Kingdra', 'Goodra', 'Druddigon', 'Salamence'] },
  { key: 'lucian', name: 'Lucian', title: 'Elite Four', place: 'Pokémon League', region: 'Sinnoh', color: '#7a3fa0',
    quote: "Pardon me, I was reading. Let's make this chapter a memorable one.", team: ['Mr. Mime', 'Espeon', 'Bronzong', 'Reuniclus', 'Gallade', 'Alakazam'] },
  { key: 'elesa', name: 'Elesa', title: 'Gym Leader', place: 'Nimbasa Gym', region: 'Unova', color: '#e8c33a',
    quote: "Get ready to be dazzled! My Pokémon are electrifying!", team: ['Zebstrika', 'Galvantula', 'Ampharos', 'Jolteon', 'Electivire', 'Eelektross'] },
  { key: 'grimsley', name: 'Grimsley', title: 'Elite Four', place: 'Pokémon League', region: 'Unova', color: '#3a3a4a',
    quote: 'Life is a serious battle. Let\'s see if luck is on your side.', team: ['Liepard', 'Scrafty', 'Sharpedo', 'Krookodile', 'Bisharp', 'Kingambit'] },
  { key: 'drayden', name: 'Drayden', title: 'Gym Leader', place: 'Opelucid Gym', region: 'Unova', color: '#5a6a3a',
    quote: 'Show me the depth of the bond between you and your Pokémon.', team: ['Druddigon', 'Altaria', 'Flygon', 'Dragonite', 'Hydreigon', 'Haxorus'] },
  { key: 'valerie', name: 'Valerie', title: 'Gym Leader', place: 'Laverre Gym', region: 'Kalos', color: '#d77ab8',
    quote: 'Oh… a challenger. My Fairy Pokémon will dance for you.', team: ['Mawile', 'Mr. Mime', 'Clefable', 'Togekiss', 'Florges', 'Sylveon'] },
  { key: 'acerola', name: 'Acerola', title: 'Elite Four', place: 'Pokémon League', region: 'Alola', color: '#6a4a9a',
    quote: "Hehe! My ghost Pokémon and I are gonna give you a fright!", team: ['Sableye', 'Froslass', 'Palossand', 'Dhelmise', 'Gengar', 'Mimikyu'] },
  { key: 'lusamine', name: 'Lusamine', title: 'Aether President', place: 'Aether Paradise', region: 'Alola', color: '#e8d27a',
    quote: 'I love all Pokémon. And I will not let you take what is mine.', team: ['Clefable', 'Lilligant', 'Mismagius', 'Milotic', 'Bewear', 'Sylveon'] },
  { key: 'kabu', name: 'Kabu', title: 'Gym Leader', place: 'Motostoke Gym', region: 'Galar', color: '#d85a2a',
    quote: "Every battle is a chance to burn brighter. Let's go!", team: ['Ninetales', 'Torkoal', 'Arcanine', 'Talonflame', 'Chandelure', 'Centiskorch'] },
  { key: 'nessa', name: 'Nessa', title: 'Gym Leader', place: 'Hulbury Gym', region: 'Galar', color: '#2a8ad0',
    quote: 'No matter what you come up with, my Water Pokémon will wash it away!', team: ['Pelipper', 'Golisopod', 'Barraskewda', 'Seismitoad', 'Kingler', 'Drednaw'] },
  { key: 'bea', name: 'Bea', title: 'Gym Leader', place: 'Stow-on-Side Gym', region: 'Galar', color: '#9a5a3a',
    quote: 'Training is everything. Let my fists do the talking.', team: ['Hitmontop', "Sirfetch'd", 'Hawlucha', 'Conkeldurr', 'Lucario', 'Machamp'] },
  { key: 'piers', name: 'Piers', title: 'Gym Leader', place: 'Spikemuth', region: 'Galar', color: '#4a4a5a',
    quote: "This is my last show, so let's make it loud!", team: ['Scrafty', 'Drapion', 'Honchkrow', 'Krookodile', 'Toxtricity', 'Obstagoon'] },
  { key: 'poppy', name: 'Poppy', title: 'Elite Four', place: 'Pokémon League', region: 'Paldea', color: '#c95a9a',
    quote: "I'm gonna smash you flat with my hammer! Hehe!", team: ['Copperajah', 'Magnezone', 'Bronzong', 'Corviknight', 'Klinklang', 'Tinkaton'] },
  { key: 'rika', name: 'Rika', title: 'Elite Four', place: 'Pokémon League', region: 'Paldea', color: '#8a6a3a',
    quote: "I'll be the one asking the questions. Starting with: can you win?", team: ['Whiscash', 'Camerupt', 'Donphan', 'Dugtrio', 'Krookodile', 'Clodsire'] }
];

// ---------- Full roster: every Gym Leader, Elite Four, Champion and key villain ----------
// Teams follow each trainer's strongest canon team on Bulbapedia (rematches, Pokémon World Tournament,
// post-game), evolved, regional forms replaced by base forms, and filled to 6 with on-theme Pokémon.
// Ace (strongest / signature) is last. Quotes are original lines, not quotes from the games.
// role: gym (incl. Kahunas and Trial Captains), e4, champion, villain, rival
function B(key, name, title, place, region, role, color, team, quote) {
  BOSSES.push({ key, name, title, place, region, role, color, team, quote });
}
// Kanto / Team Rocket
B('janine', 'Janine', 'Gym Leader', 'Fuchsia Gym', 'Kanto', 'gym', '#8a3fa0', ['Crobat', 'Toxicroak', 'Weezing', 'Drapion', 'Ariados', 'Venomoth'], 'A ninja strikes from the shadows. You will never see my poison coming.');
B('archer', 'Archer', 'Team Rocket Executive', 'Goldenrod Radio Tower', 'Johto', 'villain', '#3a3a4a', ['Electrode', 'Magmortar', 'Crobat', 'Arbok', 'Weezing', 'Houndoom'], 'Giovanni will return, and Team Rocket will rise again. Starting with you.');
B('ariana', 'Ariana', 'Team Rocket Executive', 'Goldenrod Radio Tower', 'Johto', 'villain', '#6a2a4a', ['Persian', 'Weezing', 'Honchkrow', 'Muk', 'Arbok', 'Vileplume'], "You've meddled enough, kid. Time I put you in your place.");
B('proton', 'Proton', 'Team Rocket Executive', 'Slowpoke Well', 'Johto', 'villain', '#4a4a5a', ['Arbok', 'Muk', 'Skuntank', 'Honchkrow', 'Weezing', 'Crobat'], "They call me the scariest guy in Team Rocket. Let's find out why.");
B('petrel', 'Petrel', 'Team Rocket Executive', 'Goldenrod Radio Tower', 'Johto', 'villain', '#5a4a3a', ['Raticate', 'Arbok', 'Muk', 'Skuntank', 'Crobat', 'Weezing'], "Ha! You fell for my disguise? No? Well... you'll still lose!");
// Johto
B('falkner', 'Falkner', 'Gym Leader', 'Violet Gym', 'Johto', 'gym', '#7a9ac8', ['Staraptor', 'Noctowl', 'Swellow', 'Honchkrow', 'Pelipper', 'Pidgeot'], "My father's bird Pokémon soar higher than ever. You won't clip our wings.");
B('bugsy', 'Bugsy', 'Gym Leader', 'Azalea Gym', 'Johto', 'gym', '#8aa830', ['Shedinja', 'Vespiquen', 'Yanmega', 'Heracross', 'Pinsir', 'Scizor'], "I've studied bug Pokémon more than anyone. Let me show you my research!");
B('chuck', 'Chuck', 'Gym Leader', 'Cianwood Gym', 'Johto', 'gym', '#a0502a', ['Hitmonchan', 'Medicham', 'Breloom', 'Hitmonlee', 'Primeape', 'Poliwrath'], 'Every morning under the waterfall, just for this moment. Come on!');
B('pryce', 'Pryce', 'Gym Leader', 'Mahogany Gym', 'Johto', 'gym', '#7ab8d0', ['Glalie', 'Froslass', 'Walrein', 'Abomasnow', 'Dewgong', 'Mamoswine'], 'Like the winter, my Pokémon have endured. You will learn patience.');
B('will', 'Will', 'Elite Four', 'Indigo Plateau', 'Johto', 'e4', '#9a4aa0', ['Bronzong', 'Grumpig', 'Jynx', 'Slowbro', 'Gardevoir', 'Xatu'], 'I have trained all over the world. My psychic Pokémon see straight through you.');
// Hoenn / Teams Magma & Aqua
B('roxanne', 'Roxanne', 'Gym Leader', 'Rustboro Gym', 'Hoenn', 'gym', '#a08a5a', ['Golem', 'Omastar', 'Kabutops', 'Aerodactyl', 'Steelix', 'Probopass'], "I studied every rule of battling. Now let's test them, shall we?");
B('brawly', 'Brawly', 'Gym Leader', 'Dewford Gym', 'Hoenn', 'gym', '#3a7ab0', ['Hitmonlee', 'Hitmonchan', 'Machamp', 'Medicham', 'Hitmontop', 'Hariyama'], 'My fists hit like the tide. Think you can stay standing?');
B('wattson', 'Wattson', 'Gym Leader', 'Mauville Gym', 'Hoenn', 'gym', '#e0c03a', ['Electivire', 'Raichu', 'Ampharos', 'Electrode', 'Magnezone', 'Manectric'], "Ho ho! I've wired this whole gym myself. Let's see you short it out!");
B('flannery', 'Flannery', 'Gym Leader', 'Lavaridge Gym', 'Hoenn', 'gym', '#e05a2a', ['Arcanine', 'Houndoom', 'Rapidash', 'Magcargo', 'Camerupt', 'Torkoal'], "My grandpa's fire burns in me. I'll scorch you with my best!");
B('winona', 'Winona', 'Gym Leader', 'Fortree Gym', 'Hoenn', 'gym', '#6ab0e0', ['Noctowl', 'Tropius', 'Pelipper', 'Dragonite', 'Skarmory', 'Altaria'], 'Witness the elegant choreography of my bird Pokémon and me!');
B('tateliza', 'Tate & Liza', 'Gym Leaders', 'Mossdeep Gym', 'Hoenn', 'gym', '#c05aa0', ['Hypno', 'Slowking', 'Claydol', 'Xatu', 'Lunatone', 'Solrock'], 'We already know what you will do. We can read each other, and you.');
B('juan', 'Juan', 'Gym Leader', 'Sootopolis Gym', 'Hoenn', 'gym', '#4a7ad0', ['Lapras', 'Politoed', 'Whiscash', 'Walrein', 'Crawdaunt', 'Kingdra'], 'Let me show you the true beauty of water. It is, if I may say, an art.');
B('sidney', 'Sidney', 'Elite Four', 'Ever Grande City', 'Hoenn', 'e4', '#4a3a5a', ['Scrafty', 'Shiftry', 'Zoroark', 'Sharpedo', 'Mandibuzz', 'Absol'], "I like that look you're giving me. This is going to be a real blast!");
B('phoebe', 'Phoebe', 'Elite Four', 'Ever Grande City', 'Hoenn', 'e4', '#6a4a9a', ['Banette', 'Mismagius', 'Drifblim', 'Chandelure', 'Dusknoir', 'Sableye'], "I trained on Mt. Pyre with the spirits. Let's see if you can touch them!");
B('glacia', 'Glacia', 'Elite Four', 'Ever Grande City', 'Hoenn', 'e4', '#8ad0e8', ['Abomasnow', 'Beartic', 'Froslass', 'Vanilluxe', 'Walrein', 'Glalie'], 'I came looking for a challenger with fire. Do try not to disappoint me.');
B('tabitha', 'Tabitha', 'Team Magma Admin', 'Mt. Chimney', 'Hoenn', 'villain', '#a03a2a', ['Weezing', 'Houndoom', 'Torkoal', 'Mightyena', 'Crobat', 'Camerupt'], "Hehehe! You're going to regret getting in Team Magma's way!");
B('courtney', 'Courtney', 'Team Magma Admin', 'Magma Hideout', 'Hoenn', 'villain', '#c04a3a', ['Crobat', 'Ninetales', 'Magcargo', 'Mightyena', 'Weezing', 'Camerupt'], '...Analyzing... You are an obstacle. Obstacles get removed.');
B('matt', 'Matt', 'Team Aqua Admin', 'Seafloor Cavern', 'Hoenn', 'villain', '#2a5aa0', ['Crobat', 'Tentacruel', 'Wailord', 'Mightyena', 'Muk', 'Sharpedo'], "Hoo hah! You're really gonna fight me? This'll be a rush!");
B('shelly', 'Shelly', 'Team Aqua Admin', 'Weather Institute', 'Hoenn', 'villain', '#3a7ab0', ['Crobat', 'Muk', 'Pelipper', 'Lanturn', 'Mightyena', 'Sharpedo'], "Ahahaha! You're a nosy one. Let's see how well you swim!");
// Sinnoh / Team Galactic
B('roark', 'Roark', 'Gym Leader', 'Oreburgh Gym', 'Sinnoh', 'gym', '#9a7a4a', ['Relicanth', 'Aerodactyl', 'Probopass', 'Tyranitar', 'Armaldo', 'Rampardos'], 'Fossils dug from the mines, raised with care. They hit like rocks, too!');
B('gardenia', 'Gardenia', 'Gym Leader', 'Eterna Gym', 'Sinnoh', 'gym', '#5aa04a', ['Jumpluff', 'Sunflora', 'Torterra', 'Breloom', 'Cherrim', 'Roserade'], "My grass Pokémon have grown big and strong. Don't underestimate them!");
B('maylene', 'Maylene', 'Gym Leader', 'Veilstone Gym', 'Sinnoh', 'gym', '#d05a7a', ['Hitmontop', 'Breloom', 'Heracross', 'Infernape', 'Medicham', 'Lucario'], "I'm going to give this everything I have. I hope you will too!");
B('crasherwake', 'Crasher Wake', 'Gym Leader', 'Pastoria Gym', 'Sinnoh', 'gym', '#3a8ad0', ['Politoed', 'Kingdra', 'Ludicolo', 'Huntail', 'Gyarados', 'Floatzel'], "Crasher Wake, the masked marvel! Prepare to be washed away!");
B('fantina', 'Fantina', 'Gym Leader', 'Hearthome Gym', 'Sinnoh', 'gym', '#8a4ab0', ['Banette', 'Drifblim', 'Dusknoir', 'Mismagius', 'Froslass', 'Gengar'], 'My ghost Pokémon will dance for you. Then they will leave you dizzy!');
B('byron', 'Byron', 'Gym Leader', 'Canalave Gym', 'Sinnoh', 'gym', '#8a9aa8', ['Skarmory', 'Steelix', 'Magnezone', 'Empoleon', 'Aggron', 'Bastiodon'], "Ha! My steel defense is unbreakable. Go ahead and try, kid!");
B('candice', 'Candice', 'Gym Leader', 'Snowpoint Gym', 'Sinnoh', 'gym', '#6ac0e0', ['Abomasnow', 'Mamoswine', 'Jynx', 'Froslass', 'Glaceon', 'Weavile'], "I'm totally focused! Let's have a battle that warms us up!");
B('aaron', 'Aaron', 'Elite Four', 'Pokémon League', 'Sinnoh', 'e4', '#9ab03a', ['Yanmega', 'Scizor', 'Flygon', 'Vespiquen', 'Heracross', 'Drapion'], 'Bug Pokémon are beautiful and strong. I will prove it to you.');
B('bertha', 'Bertha', 'Elite Four', 'Pokémon League', 'Sinnoh', 'e4', '#a08050', ['Whiscash', 'Gliscor', 'Nidoking', 'Hippowdon', 'Mamoswine', 'Rhyperior'], "Well, aren't you a lively one. Let's see if you're as tough as you look.");
B('mars', 'Mars', 'Team Galactic Commander', 'Lake Verity', 'Sinnoh', 'villain', '#c04a6a', ['Honchkrow', 'Toxicroak', 'Skuntank', 'Bronzong', 'Crobat', 'Purugly'], "You again? Fine. Mars, Team Galactic's commander, will crush you herself.");
B('jupiter', 'Jupiter', 'Team Galactic Commander', 'Galactic HQ', 'Sinnoh', 'villain', '#6a4aa0', ['Honchkrow', 'Weavile', 'Drapion', 'Bronzong', 'Crobat', 'Skuntank'], 'Our boss is building a new world. You are not invited.');
B('saturn', 'Saturn', 'Team Galactic Commander', 'Lake Valor', 'Sinnoh', 'villain', '#3a6aa0', ['Alakazam', 'Honchkrow', 'Skuntank', 'Bronzong', 'Crobat', 'Toxicroak'], 'I follow the boss because his vision is clear. Yours, I wonder about.');
B('charon', 'Charon', 'Team Galactic Commander', 'Stark Mountain', 'Sinnoh', 'villain', '#7a6a9a', ['Electrode', 'Porygon-Z', 'Bronzong', 'Magnezone', 'Rotom', 'Heatran'], "Science needs no morals. Let me show you what my research has produced.");
// Unova / Team Plasma
B('cilan', 'Cilan', 'Gym Leader', 'Striaton Gym', 'Unova', 'gym', '#5ab04a', ['Jumpluff', 'Whimsicott', 'Lilligant', 'Maractus', 'Ferrothorn', 'Simisage'], 'Allow me to serve you a battle with the perfect flavor of grass!');
B('chili', 'Chili', 'Gym Leader', 'Striaton Gym', 'Unova', 'gym', '#e05a3a', ['Arcanine', 'Camerupt', 'Magmortar', 'Heatmor', 'Darmanitan', 'Simisear'], "Ta-da! I'm Chili, and I'm fired up! Let's turn up the heat!");
B('cress', 'Cress', 'Gym Leader', 'Striaton Gym', 'Unova', 'gym', '#3a8ad0', ['Golduck', 'Floatzel', 'Azumarill', 'Slowking', 'Basculin', 'Simipour'], 'Water is the source of all life. Please, enjoy this refreshing battle.');
B('lenora', 'Lenora', 'Gym Leader', 'Nacrene Gym', 'Unova', 'gym', '#a08a6a', ['Watchog', 'Braviary', 'Cinccino', 'Sawsbuck', 'Lickilicky', 'Kangaskhan'], "As a researcher, I want to see how you and your Pokémon fight. Let's go!");
B('burgh', 'Burgh', 'Gym Leader', 'Castelia Gym', 'Unova', 'gym', '#8aa83a', ['Vespiquen', 'Crustle', 'Escavalier', 'Accelgor', 'Durant', 'Leavanny'], 'Inspiration strikes! My bug Pokémon and I will paint you a masterpiece.');
B('clay', 'Clay', 'Gym Leader', 'Driftveil Gym', 'Unova', 'gym', '#9a7a4a', ['Claydol', 'Mamoswine', 'Seismitoad', 'Golurk', 'Krookodile', 'Excadrill'], "Ya got some grit, kid. Let's see if it's enough to dig through me!");
B('skyla', 'Skyla', 'Gym Leader', 'Mistralton Gym', 'Unova', 'gym', '#5ab0e0', ['Unfezant', 'Swoobat', 'Mandibuzz', 'Archeops', 'Braviary', 'Swanna'], "Ready for take-off? My flying Pokémon and I will soar right past you!");
B('brycen', 'Brycen', 'Gym Leader', 'Icirrus Gym', 'Unova', 'gym', '#7ab0d0', ['Cryogonal', 'Vanilluxe', 'Weavile', 'Dewgong', 'Walrein', 'Beartic'], 'Overcome the harshest cold, and you will know true strength.');
B('cheren', 'Cheren', 'Gym Leader', 'Aspertia Gym', 'Unova', 'gym', '#5a6a8a', ['Liepard', 'Unfezant', 'Gigalith', 'Haxorus', 'Simisage', 'Emboar'], "I'm still figuring out what strength really means. Help me find out.");
B('roxie', 'Roxie', 'Gym Leader', 'Virbank Gym', 'Unova', 'gym', '#a03a9a', ['Seviper', 'Crobat', 'Garbodor', 'Drapion', 'Amoonguss', 'Scolipede'], "Get ready to be poisoned by our sick beats and our sicker Pokémon!");
B('marlon', 'Marlon', 'Gym Leader', 'Humilau Gym', 'Unova', 'gym', '#2a8ac0', ['Mantine', 'Wailord', 'Starmie', 'Alomomola', 'Carracosta', 'Jellicent'], "Yo! The sea's real big, and so are my waves. Hope you can surf!");
B('shauntal', 'Shauntal', 'Elite Four', 'Pokémon League', 'Unova', 'e4', '#6a4a8a', ['Cofagrigus', 'Gengar', 'Froslass', 'Drifblim', 'Golurk', 'Chandelure'], 'Excuse me, I was writing. Our battle will make an excellent chapter.');
B('caitlin', 'Caitlin', 'Elite Four', 'Pokémon League', 'Unova', 'e4', '#c06ab0', ['Musharna', 'Alakazam', 'Gothitelle', 'Gallade', 'Reuniclus', 'Metagross'], 'You woke me from my rest. Very well, show me a battle worth staying awake for.');
B('marshal', 'Marshal', 'Elite Four', 'Pokémon League', 'Unova', 'e4', '#a04a2a', ['Throh', 'Sawk', 'Lucario', 'Mienshao', 'Machamp', 'Conkeldurr'], 'I am Alder\'s student. Show me your fighting spirit, with everything you have!');
B('colress', 'Colress', 'Team Plasma Boss', 'Plasma Frigate', 'Unova', 'villain', '#3a8a9a', ['Porygon-Z', 'Rotom-Wash', 'Metagross', 'Beheeyem', 'Magnezone', 'Klinklang'], "I want to unlock the full potential of Pokémon. You'll make a fine experiment.");
B('zinzolin', 'Zinzolin', 'Seven Sages', 'Opelucid City', 'Unova', 'villain', '#4a5a9a', ['Liepard', 'Watchog', 'Scolipede', 'Cryogonal', 'Froslass', 'Weavile'], "Brrr. You've come all this way only to be frozen in your tracks.");
// Kalos / Team Flare
B('viola', 'Viola', 'Gym Leader', 'Santalune Gym', 'Kalos', 'gym', '#8ab03a', ['Beautifly', 'Pinsir', 'Scolipede', 'Heracross', 'Masquerain', 'Vivillon'], "Whether it's victory or defeat, I'll capture this battle in a perfect shot!");
B('grant', 'Grant', 'Gym Leader', 'Cyllage Gym', 'Kalos', 'gym', '#9a7a5a', ['Carbink', 'Probopass', 'Barbaracle', 'Gigalith', 'Aurorus', 'Tyrantrum'], 'There is a wall in front of you. Climb it, and show me how far you go.');
B('korrina', 'Korrina', 'Gym Leader', 'Shalour Gym', 'Kalos', 'gym', '#d05a5a', ['Gallade', 'Crabominable', 'Medicham', 'Hawlucha', 'Chesnaught', 'Lucario'], "Lucario and I are going full throttle! Time for some Mega power... or close!");
B('ramos', 'Ramos', 'Gym Leader', 'Coumarine Gym', 'Kalos', 'gym', '#6a9a3a', ['Jumpluff', 'Chesnaught', 'Trevenant', 'Sawsbuck', 'Victreebel', 'Gogoat'], "Hohoho! Plants grow strong over many years, sprout. Let's see your roots.");
B('clemont', 'Clemont', 'Gym Leader', 'Lumiose Gym', 'Kalos', 'gym', '#e0c03a', ['Emolga', 'Dedenne', 'Ampharos', 'Luxray', 'Magnezone', 'Heliolisk'], 'The future is now, thanks to science! My electric Pokémon are fully charged!');
B('olympia', 'Olympia', 'Gym Leader', 'Anistar Gym', 'Kalos', 'gym', '#9a5ab0', ['Gothitelle', 'Delphox', 'Reuniclus', 'Sigilyph', 'Slowking', 'Meowstic'], 'I have seen the stars align. The outcome of this battle is already written.');
B('wulfric', 'Wulfric', 'Gym Leader', 'Snowbelle Gym', 'Kalos', 'gym', '#7ac0d0', ['Cryogonal', 'Beartic', 'Mamoswine', 'Weavile', 'Abomasnow', 'Avalugg'], "Har! You came all this way? Let's see if you can handle the cold!");
B('malva', 'Malva', 'Elite Four', 'Pokémon League', 'Kalos', 'e4', '#d0502a', ['Torkoal', 'Houndoom', 'Delphox', 'Chandelure', 'Pyroar', 'Talonflame'], "I'll burn you to a crisp... on air, for everyone to see.");
B('siebold', 'Siebold', 'Elite Four', 'Pokémon League', 'Kalos', 'e4', '#3a7ab0', ['Clawitzer', 'Gyarados', 'Starmie', 'Kingdra', 'Greninja', 'Barbaracle'], 'Cooking and battling are both arts. Let me prepare something exquisite.');
B('wikstrom', 'Wikstrom', 'Elite Four', 'Pokémon League', 'Kalos', 'e4', '#8a9ab0', ['Klefki', 'Probopass', 'Lucario', 'Bisharp', 'Scizor', 'Aegislash'], 'Well met, challenger! My steel and I shall meet you blade to blade!');
B('drasna', 'Drasna', 'Elite Four', 'Pokémon League', 'Kalos', 'e4', '#6a5ab0', ['Dragalge', 'Druddigon', 'Altaria', 'Goodra', 'Haxorus', 'Noivern'], "Oh my, a challenger! My dragons and I have been so bored. Let's have fun!");
B('xerosic', 'Xerosic', 'Team Flare Scientist', 'Lysandre Labs', 'Kalos', 'villain', '#c04a2a', ['Klefki', 'Magnezone', 'Porygon-Z', 'Bisharp', 'Crobat', 'Malamar'], 'My inventions have no equal. Allow me a small demonstration.');
B('aliana', 'Aliana', 'Team Flare Admin', 'Team Flare Secret HQ', 'Kalos', 'villain', '#d04a3a', ['Houndoom', 'Pyroar', 'Honchkrow', 'Weavile', 'Mightyena', 'Druddigon'], "Team Flare does what's beautiful. You, sadly, are not on the list.");
B('bryony', 'Bryony', 'Team Flare Admin', 'Team Flare Secret HQ', 'Kalos', 'villain', '#a03a3a', ['Manectric', 'Mightyena', 'Houndoom', 'Malamar', 'Liepard', 'Bisharp'], 'Our calculations say you lose. Let us confirm the result.');
B('celosia', 'Celosia', 'Team Flare Admin', 'Team Flare Secret HQ', 'Kalos', 'villain', '#e05a3a', ['Liepard', 'Mightyena', 'Houndoom', 'Pyroar', 'Manectric', 'Drapion'], 'Ahaha, a battle? How tedious. Fine, I suppose I can spare a minute.');
B('mable', 'Mable', 'Team Flare Admin', 'Team Flare Secret HQ', 'Kalos', 'villain', '#b04a2a', ['Mightyena', 'Liepard', 'Bisharp', 'Pyroar', 'Houndoom', 'Weavile'], 'Team Flare makes the future. You are just in the way of it.');
// Alola / Team Skull / Aether
B('hala', 'Hala', 'Island Kahuna', "Melemele Island", 'Alola', 'gym', '#b05a2a', ['Hariyama', 'Primeape', 'Bewear', 'Poliwrath', 'Machamp', 'Crabominable'], "Ho ho! Let's see how the island's challenge has made you grow!");
B('olivia', 'Olivia', 'Island Kahuna', "Akala Island", 'Alola', 'gym', '#c05a7a', ['Golem-Alola', 'Armaldo', 'Cradily', 'Gigalith', 'Probopass', 'Lycanroc-Midnight'], 'My rock Pokémon are as hard as diamonds. Ready to get crushed?');
B('nanu', 'Nanu', 'Island Kahuna', "Ula'ula Island", 'Alola', 'gym', '#4a4a5a', ['Sableye', 'Krookodile', 'Honchkrow', 'Absol', 'Houndoom', 'Persian-Alola'], "Ugh. Fine. Let's get this over with so I can get back to my cats.");
B('hapu', 'Hapu', 'Island Kahuna', "Poni Island", 'Alola', 'gym', '#8a6a3a', ['Dugtrio-Alola', 'Golurk', 'Gastrodon', 'Krookodile', 'Flygon', 'Mudsdale'], 'The land of Poni is harsh but honest. My Pokémon carry its strength.');
B('ilima', 'Ilima', 'Trial Captain', 'Verdant Cavern', 'Alola', 'gym', '#a08a6a', ['Smeargle', 'Komala', 'Kangaskhan', 'Bewear', 'Snorlax', 'Gumshoos'], 'Normal Pokémon can do anything. Let me show you how versatile they are!');
B('lana', 'Lana', 'Trial Captain', 'Brooklet Hill', 'Alola', 'gym', '#3a9ad0', ['Lapras', 'Toxapex', 'Wishiwashi', 'Lanturn', 'Cloyster', 'Araquanid'], "I'm... not lying this time. My water Pokémon really are this strong.");
B('kiawe', 'Kiawe', 'Trial Captain', 'Wela Volcano Park', 'Alola', 'gym', '#d04a2a', ['Turtonator', 'Salazzle', 'Magmortar', 'Arcanine', 'Talonflame', 'Marowak-Alola'], 'Fire burns in the heart of every dancer. Feel the heat of my dance!');
B('mallow', 'Mallow', 'Trial Captain', 'Lush Jungle', 'Alola', 'gym', '#5ab05a', ['Comfey', 'Gogoat', 'Lurantis', 'Trevenant', 'Shiinotic', 'Tsareena'], "I've cooked up a battle with all the freshest ingredients. Dig in!");
B('sophocles', 'Sophocles', 'Trial Captain', 'Hokulani Observatory', 'Alola', 'gym', '#e0b03a', ['Raichu', 'Togedemaru', 'Magnezone', 'Electivire', 'Golem-Alola', 'Vikavolt'], "I programmed this battle down to the last volt. Let's run the test!");
B('mina', 'Mina', 'Trial Captain', 'Vast Poni Canyon', 'Alola', 'gym', '#e07ab0', ['Mr. Mime', 'Klefki', 'Granbull', 'Shiinotic', 'Wigglytuff', 'Ribombee'], "Oh, you want to battle? Sure. I'll paint something pretty with it.");
B('kahili', 'Kahili', 'Elite Four', 'Pokémon League', 'Alola', 'e4', '#6ab0c0', ['Skarmory', 'Braviary', 'Hawlucha', 'Oricorio', 'Mandibuzz', 'Toucannon'], "A golfer reads the wind. A trainer reads the battle. I'm both.");
B('molayne', 'Molayne', 'Elite Four', 'Pokémon League', 'Alola', 'e4', '#8a9aa8', ['Skarmory', 'Klefki', 'Bisharp', 'Magnezone', 'Metagross', 'Dugtrio-Alola'], "Let's see how your Pokémon hold up against some real steel.");
B('hau', 'Hau', 'Champion', 'Pokémon League', 'Alola', 'champion', '#e0a03a', ['Raichu-Alola', 'Tauros', 'Noivern', 'Crabominable', 'Vaporeon', 'Decidueye'], "I'm defending the title now! Let's have the most fun battle ever!");
B('plumeria', 'Plumeria', 'Team Skull Admin', 'Po Town', 'Alola', 'villain', '#8a3aa0', ['Garbodor', 'Gengar', 'Muk-Alola', 'Crobat', 'Toxapex', 'Salazzle'], "You messed with my grunts. Now you deal with their big sis.");
B('faba', 'Faba', 'Aether Branch Chief', 'Aether Paradise', 'Alola', 'villain', '#c0b05a', ['Claydol', 'Bruxish', 'Raichu-Alola', 'Alakazam', 'Slowbro', 'Hypno'], 'I am the Aether Foundation\'s greatest mind. You are merely an inconvenience.');
// Galar / Macro Cosmos
B('milo', 'Milo', 'Gym Leader', 'Turffield Stadium', 'Galar', 'gym', '#6ab04a', ['Shiftry', 'Eldegoss', 'Tsareena', 'Cherrim', 'Ludicolo', 'Flapple'], "You look like a fine sprout! Let's see how tall you've grown!");
B('allister', 'Allister', 'Gym Leader', 'Stow-on-Side Stadium', 'Galar', 'gym', '#5a4a8a', ['Dusknoir', 'Chandelure', 'Cursola', 'Polteageist', 'Mimikyu', 'Gengar'], '...Um... the ghosts said you were strong. I hope... they were wrong.');
B('opal', 'Opal', 'Gym Leader', 'Ballonlea Stadium', 'Galar', 'gym', '#d07ab0', ['Mawile', 'Granbull', 'Weezing-Galar', 'Togekiss', 'Hatterene', 'Alcremie'], "Pop quiz, dearie! What's my favorite color? Answer wrong and you lose!");
B('gordie', 'Gordie', 'Gym Leader', 'Circhester Stadium', 'Galar', 'gym', '#7a6a5a', ['Barbaracle', 'Shuckle', 'Stonjourner', 'Gigalith', 'Tyranitar', 'Coalossal'], "I'm not living in my mom's shadow. My rock Pokémon will prove it.");
B('melony', 'Melony', 'Gym Leader', 'Circhester Stadium', 'Galar', 'gym', '#8ac0e0', ['Frosmoth', 'Mr. Rime', 'Eiscue', 'Darmanitan-Galar', 'Avalugg', 'Lapras'], "I'll treat you just like my own kids. That means no going easy!");
B('hop', 'Hop', 'Rival', 'Wyndon Stadium', 'Galar', 'rival', '#7a5ab0', ['Dubwool', 'Snorlax', 'Pincurchin', 'Corviknight', 'Inteleon', 'Zamazenta'], "I've been training nonstop! This time I'm gonna beat you, mate!");
B('bede', 'Bede', 'Gym Leader', 'Ballonlea Stadium', 'Galar', 'rival', '#c06ab0', ['Mawile', 'Gardevoir', 'Rapidash-Galar', 'Sylveon', 'Florges', 'Hatterene'], "Still here? How irritating. Let me show you what real talent looks like.");
B('oleana', 'Oleana', 'Chairman\'s Secretary', 'Rose Tower', 'Galar', 'villain', '#6a6a8a', ['Liepard', 'Froslass', 'Tsareena', 'Salazzle', 'Milotic', 'Garbodor'], 'The Chairman\'s plan will not be disturbed. Least of all by you.');
// Paldea / Team Star
B('katy', 'Katy', 'Gym Leader', 'Cortondo Gym', 'Paldea', 'gym', '#a0b03a', ['Spidops', 'Heracross', 'Forretress', 'Lokix', 'Araquanid', 'Ursaring'], "Let's see if you can handle my bug Pokémon. They're sweeter than they look!");
B('brassius', 'Brassius', 'Gym Leader', 'Artazon Gym', 'Paldea', 'gym', '#5aa04a', ['Breloom', 'Arboliva', 'Vileplume', 'Tsareena', 'Lilligant', 'Sudowoodo'], 'Behold my living art! This battle shall be my next masterpiece!');
B('iono', 'Iono', 'Gym Leader', 'Levincia Gym', 'Paldea', 'gym', '#e0c03a', ['Kilowattrel', 'Electrode', 'Bellibolt', 'Luxray', 'Electivire', 'Mismagius'], "Heeey, chat! We've got a challenger! Smash that like button and watch me win!");
B('kofu', 'Kofu', 'Gym Leader', 'Cascarrafa Gym', 'Paldea', 'gym', '#3a8ad0', ['Pelipper', 'Veluza', 'Feraligatr', 'Wugtrio', 'Clawitzer', 'Crabominable'], "I'm gonna serve you up a fresh platter of defeat, with a side of seafood!");
B('larry', 'Larry', 'Elite Four & Gym Leader', 'Medali Gym', 'Paldea', 'e4', '#8a8a7a', ['Oinkologne-F', 'Tauros', 'Dudunsparce', 'Altaria', 'Flamigo', 'Staraptor'], "I'd rather be eating. But fine. Let's do this, nice and normal.");
B('ryme', 'Ryme', 'Gym Leader', 'Montenevera Gym', 'Paldea', 'gym', '#6a4a8a', ['Banette', 'Mimikyu', 'Golurk', 'Spiritomb', 'Houndstone', 'Toxtricity'], "Yo, yo! MC Ryme on the mic, and I'm about to drop your HP to zero!");
B('tulip', 'Tulip', 'Gym Leader', 'Alfornada Gym', 'Paldea', 'gym', '#d07ab0', ['Farigiraf', 'Gardevoir', 'Espathra', 'Gallade', 'Delphox', 'Florges'], "Let me give your battle style a makeover. You'll look gorgeous losing.");
B('grusha', 'Grusha', 'Gym Leader', 'Glaseado Gym', 'Paldea', 'gym', '#8ac0e0', ['Ninetales-Alola', 'Beartic', 'Frosmoth', 'Cetitan', 'Weavile', 'Altaria'], "Cool head, cold Pokémon. Don't expect any warmth from me.");
B('giacomo', 'Giacomo', 'Team Star Boss', 'Segin Squad Base', 'Paldea', 'villain', '#3a3a4a', ['Revavroom', 'Cacturne', 'Honchkrow', 'Mabosstiff', 'Krookodile', 'Kingambit'], "Drop the beat. This battle's getting remixed, and you're the sample.");
B('mela', 'Mela', 'Team Star Boss', 'Schedar Squad Base', 'Paldea', 'villain', '#d04a2a', ['Revavroom', 'Torkoal', 'Coalossal', 'Houndoom', 'Arcanine', 'Armarouge'], "You wanna fight Team Star? Then you better be ready to get burned!");
B('atticus', 'Atticus', 'Team Star Boss', 'Navi Squad Base', 'Paldea', 'villain', '#8a3aa0', ['Glimmora', 'Skuntank', 'Muk', 'Dragalge', 'Toxapex', 'Revavroom'], 'Poison seeps in slowly, yet unstoppably. So too will your defeat.');
B('ortega', 'Ortega', 'Team Star Boss', 'Ruchbah Squad Base', 'Paldea', 'villain', '#e07ab0', ['Revavroom', 'Klefki', 'Azumarill', 'Wigglytuff', 'Hatterene', 'Dachsbun'], "Ugh, you again?! Fine! My Fairy Pokémon are gonna make you cry!");
B('eri', 'Eri', 'Team Star Boss', 'Caph Squad Base', 'Paldea', 'villain', '#a04a2a', ['Revavroom', 'Primeape', 'Toxicroak', 'Passimian', 'Lucario', 'Annihilape'], "I won't back down. Not for you, not for anyone. Bring it!");
B('penny', 'Penny', 'Team Star Boss (Cassiopeia)', 'Naranja Academy', 'Paldea', 'villain', '#6a5ab0', ['Vaporeon', 'Jolteon', 'Flareon', 'Leafeon', 'Umbreon', 'Sylveon'], "Cassiopeia never shows her face... but I guess you've earned a real battle.");
// Blueberry League (Blueberry Academy, Indigo Disk)
B('crispin', 'Crispin', 'Blueberry Elite Four', 'Blueberry Academy', 'Blueberry', 'e4', '#e05a2a', ['Rotom-Heat', 'Talonflame', 'Exeggutor', 'Camerupt', 'Magmortar', 'Blaziken'], "Hot hot HOT! I'm gonna set this whole battle on fire!");
B('amarys', 'Amarys', 'Blueberry Elite Four', 'Blueberry Academy', 'Blueberry', 'e4', '#8a9ab0', ['Skarmory', 'Dugtrio-Alola', 'Scizor', 'Reuniclus', 'Empoleon', 'Metagross'], "...I'll fight. Just don't expect me to make small talk.");
B('lacey', 'Lacey', 'Blueberry Elite Four', 'Blueberry Academy', 'Blueberry', 'e4', '#e07ab0', ['Whimsicott', 'Granbull', 'Primarina', 'Slowbro-Galar', 'Alcremie', 'Excadrill'], "I'm the disciplinary officer, and you're getting a lesson! In battling!");
B('drayton', 'Drayton', 'Blueberry Elite Four', 'Blueberry Academy', 'Blueberry', 'e4', '#5a5ab0', ['Dragonite', 'Flygon', 'Haxorus', 'Sceptile', 'Kingdra', 'Archaludon'], "Can't be bothered to try hard... but I guess I'll make an exception.");
B('kieran', 'Kieran', 'Champion', 'Blueberry Academy', 'Blueberry', 'champion', '#3a6a5a', ['Poliwrath', 'Dragonite', 'Porygon-Z', 'Grimmsnarl', 'Incineroar', 'Hydrapple'], "I got stronger. Much stronger. This time I'm not losing to you.");

// Rivals (strongest canon team on Bulbapedia; where the starter depends on the player's choice, one is picked)
B('brendan', 'Brendan', 'Rival', 'Route 119', 'Hoenn', 'rival', '#3a7a5a', ['Swellow', 'Raichu', 'Wailord', 'Breloom', 'Magcargo', 'Swampert'], "Dad's a Gym Leader, but I've got my own path. Let's see who's grown more!");
B('may', 'May', 'Rival', 'Lilycove City', 'Hoenn', 'rival', '#d04a4a', ['Swellow', 'Raichu', 'Wailord', 'Breloom', 'Magcargo', 'Blaziken'], "I've been studying Pokémon all over Hoenn. Ready for my field report?");
B('trace', 'Trace', 'Rival', 'Indigo Plateau', 'Kanto', 'rival', '#4a6ab0', ['Pidgeot', 'Vileplume', 'Marowak', 'Rapidash', 'Slowbro', 'Jolteon'], "Hey! I've been training like crazy. Let's settle who's the best in Kanto!");
B('barry', 'Barry', 'Rival', 'Battle Tower', 'Sinnoh', 'rival', '#e0a03a', ['Staraptor', 'Floatzel', 'Heracross', 'Roserade', 'Snorlax', 'Infernape'], "Hurry up! I'm fining you a million if you make me wait any longer!");
B('dawn', 'Dawn', 'Rival', 'Sandgem Town', 'Sinnoh', 'rival', '#d05a8a', ['Togekiss', 'Bellossom', 'Mamoswine', 'Typhlosion', 'Lopunny', 'Empoleon'], "No need to worry! My Pokémon and I are totally ready for this.");
B('lucas', 'Lucas', 'Rival', 'Sandgem Town', 'Sinnoh', 'rival', '#4a6ab0', ['Gliscor', 'Cradily', 'Glaceon', 'Rotom-Heat', 'Tauros', 'Torterra'], "I've been filling in the Pokédex for the professor. Let's see what I learned!");
B('bianca', 'Bianca', 'Rival', 'Nuvema Town', 'Unova', 'rival', '#7ab04a', ['Stoutland', 'Simisear', 'Musharna', 'Mienshao', 'Chandelure', 'Samurott'], "Ummm, I'm not as weak as everyone thinks! I'll show you, OK?");
B('hugh', 'Hugh', 'Rival', 'Aspertia City', 'Unova', 'rival', '#3a5a9a', ['Unfezant', 'Simipour', 'Bouffalant', 'Flygon', 'Eelektross', 'Emboar'], "I'm getting stronger to take back what was stolen. You're my test.");
B('shauna', 'Shauna', 'Rival', 'Vaniville Town', 'Kalos', 'rival', '#e07ab0', ['Furfrou', 'Delcatty', 'Florges', 'Sylveon', 'Goodra', 'Greninja'], "Let's have a super fun battle! Win or lose, we're friends forever!");
B('tierno', 'Tierno', 'Rival', 'Route 8', 'Kalos', 'rival', '#e0a03a', ['Oricorio', 'Ludicolo', 'Hawlucha', 'Talonflame', 'Roserade', 'Crawdaunt'], "Our battle is gonna be a dance! Let's get groovin'!");
B('trevor', 'Trevor', 'Rival', 'Route 8', 'Kalos', 'rival', '#7a6ab0', ['Vivillon', 'Noivern', 'Electrode', 'Raichu', 'Aerodactyl', 'Florges'], "I've registered every Pokémon on this team. Now let me record a win.");
B('calem', 'Calem', 'Rival', 'Victory Road', 'Kalos', 'rival', '#3a4a7a', ['Meowstic', 'Clefable', 'Jolteon', 'Absol', 'Altaria', 'Delphox'], "I have to become stronger than my parents. Let's see where I stand.");
B('serena', 'Serena', 'Rival', 'Victory Road', 'Kalos', 'rival', '#d04a6a', ['Meowstic', 'Clefable', 'Vaporeon', 'Absol', 'Altaria', 'Greninja'], "I won't fall behind anymore. This battle, I'm giving it everything!");
B('gladion', 'Gladion', 'Rival', 'Aether Paradise', 'Alola', 'rival', '#3a3a4a', ['Crobat', 'Zoroark', 'Porygon-Z', 'Lucario', 'Charizard', 'Silvally'], "I don't battle to make friends. I battle to get stronger. Come on.");
B('arven', 'Arven', 'Rival', 'Naranja Academy', 'Paldea', 'rival', '#6a8a3a', ['Greedent', 'Cloyster', 'Scovillain', 'Toedscruel', 'Garganacl', 'Mabosstiff'], "Let's get this battle cooking. My sandwiches made these guys tough!");
B('carmine', 'Carmine', 'Rival', 'Kitakami', 'Paldea', 'rival', '#c03a5a', ['Mightyena', 'Toucannon', 'Morpeko', 'Ninetales', 'Scrafty', 'Sinistcha'], "Don't think I'll go easy just 'cause you're a guest. Bring it!");

// Roles for the original bosses
const BOSS_ROLES = {
  red: 'champion', blue: 'gym', giovanni: 'villain', lance: 'champion', karen: 'e4', steven: 'champion', wallace: 'champion',
  cynthia: 'champion', volkner: 'gym', iris: 'champion', ghetsis: 'villain', diantha: 'champion', lysandre: 'villain',
  kukui: 'champion', leon: 'champion', raihan: 'gym', geeta: 'champion', brock: 'gym', misty: 'gym', ltsurge: 'gym',
  erika: 'gym', sabrina: 'gym', blaine: 'gym', silver: 'rival', morty: 'gym', wally: 'rival', maxie: 'villain',
  archie: 'villain', cyrus: 'villain', flint: 'e4', volo: 'villain', alder: 'champion', n: 'villain', guzma: 'villain',
  marnie: 'gym', rose: 'villain', hassel: 'e4', nemona: 'champion', lorelei: 'e4', bruno: 'e4', agatha: 'e4', koga: 'e4',
  clair: 'gym', whitney: 'gym', jasmine: 'gym', norman: 'gym', drake: 'e4', lucian: 'e4', elesa: 'gym', grimsley: 'e4',
  drayden: 'gym', valerie: 'gym', acerola: 'e4', lusamine: 'villain', kabu: 'gym', nessa: 'gym', bea: 'gym', piers: 'gym',
  poppy: 'e4', rika: 'e4'
};
// Showdown trainer sprite file names that differ from the key (Aliana and Celosia have none; they get a fallback)
const BOSS_SPRITES = { tateliza: 'tateandliza-gen3', phoebe: 'phoebe-gen3', arven: 'arven-v' };
for (const b of BOSSES) {
  b.role = b.role || BOSS_ROLES[b.key];
  if (BOSS_SPRITES[b.key]) b.sprite = BOSS_SPRITES[b.key];
}

// ---------- Ability showcase Pokémon ----------
P('Azumarill', 184, 'Water/Fairy', [100, 50, 80, 60, 80, 50], ['Play Rough', 'Liquidation', 'Aqua Jet', 'Knock Off']);
P('Medicham', 308, 'Fighting/Psychic', [60, 60, 75, 60, 75, 80], ['High Jump Kick', 'Zen Headbutt', 'Bullet Punch', 'Ice Punch']);

// ---------- Expansion pack 2 ----------
P('Arbok', 24, 'Poison', [60, 95, 69, 65, 79, 80], ['Gunk Shot', 'Earthquake', 'Sucker Punch', 'Coil']);
P('Venomoth', 49, 'Bug/Poison', [70, 65, 60, 90, 75, 90], ['Bug Buzz', 'Sludge Bomb', 'Sleep Powder', 'Quiver Dance']);
P('Dewgong', 87, 'Water/Ice', [90, 70, 80, 70, 95, 70], ['Surf', 'Ice Beam', 'Knock Off', 'Toxic']);
P('Jynx', 124, 'Ice/Psychic', [65, 50, 35, 115, 95, 95], ['Ice Beam', 'Psychic', 'Lovely Kiss', 'Focus Blast']);
P('Lanturn', 171, 'Water/Electric', [125, 58, 58, 76, 76, 67], ['Scald', 'Thunderbolt', 'Ice Beam', 'Thunder Wave']);
P('Hitmontop', 237, 'Fighting', [50, 95, 95, 35, 110, 70], ['Close Combat', 'Mach Punch', 'Stone Edge', 'Sucker Punch']);
P('Miltank', 241, 'Normal', [95, 80, 105, 40, 70, 100], ['Body Slam', 'Earthquake', 'Play Rough', 'Milk Drink']);
P('Pelipper', 279, 'Water/Flying', [60, 50, 100, 95, 70, 65], ['Hurricane', 'Scald', 'Ice Beam', 'Roost']);
P('Slaking', 289, 'Normal', [150, 160, 100, 95, 65, 100], ['Return', 'Earthquake', 'Knock Off', 'Fire Punch']);
P('Sableye', 302, 'Dark/Ghost', [50, 75, 75, 65, 65, 50], ['Knock Off', 'Shadow Claw', 'Will-O-Wisp', 'Recover']);
P('Mawile', 303, 'Steel/Fairy', [50, 85, 85, 55, 55, 50], ['Play Rough', 'Iron Head', 'Sucker Punch', 'Swords Dance']);
P('Torkoal', 324, 'Fire', [70, 85, 140, 85, 70, 20], ['Fire Blast', 'Earth Power', 'Will-O-Wisp', 'Toxic']);
P('Zebstrika', 523, 'Electric', [75, 100, 63, 80, 63, 116], ['Wild Charge', 'High Horsepower', 'Overheat', 'Quick Attack']);
P('Scolipede', 545, 'Bug/Poison', [60, 100, 89, 55, 69, 112], ['Megahorn', 'Poison Jab', 'Earthquake', 'Swords Dance']);
P('Amoonguss', 591, 'Grass/Poison', [114, 85, 70, 85, 80, 30], ['Spore', 'Giga Drain', 'Sludge Bomb', 'Toxic']);
P('Toxapex', 748, 'Poison/Water', [50, 63, 152, 53, 142, 35], ['Scald', 'Sludge Bomb', 'Toxic', 'Recover']);
P('Araquanid', 752, 'Water/Bug', [68, 70, 92, 50, 132, 42], ['Liquidation', 'Leech Life', 'Crunch', 'Toxic']);
P('Palossand', 770, 'Ghost/Ground', [85, 75, 110, 100, 75, 35], ['Shadow Ball', 'Earth Power', 'Giga Drain', 'Shore Up']);
P('Dhelmise', 781, 'Ghost/Grass', [70, 131, 100, 86, 90, 40], ['Phantom Force', 'Power Whip', 'Iron Head', 'Earthquake']);
P('Drednaw', 834, 'Water/Rock', [90, 115, 90, 48, 68, 74], ['Liquidation', 'Stone Edge', 'Crunch', 'Shell Smash']);
P('Centiskorch', 851, 'Fire/Bug', [100, 115, 65, 90, 90, 65], ['Flare Blitz', 'Leech Life', 'Knock Off', 'Coil']);
P('Obstagoon', 862, 'Dark/Normal', [93, 90, 101, 60, 81, 95], ['Facade', 'Knock Off', 'Close Combat', 'Gunk Shot']);
P("Sirfetch'd", 865, 'Fighting', [62, 135, 95, 68, 82, 65], ['Close Combat', 'Leaf Blade', 'Knock Off', 'Brave Bird']);
P('Frosmoth', 873, 'Ice/Bug', [70, 65, 60, 125, 90, 65], ['Ice Beam', 'Bug Buzz', 'Giga Drain', 'Quiver Dance']);
P('Kilowattrel', 941, 'Electric/Flying', [70, 70, 60, 105, 60, 125], ['Thunderbolt', 'Hurricane', 'Air Slash', 'Roost']);
P('Tinkaton', 959, 'Fairy/Steel', [85, 75, 77, 70, 105, 94], ['Play Rough', 'Ice Hammer', 'Knock Off', 'Swords Dance']);
P('Annihilape', 979, 'Fighting/Ghost', [110, 115, 80, 50, 90, 90], ['Drain Punch', 'Shadow Claw', 'Close Combat', 'Bulk Up']);
P('Farigiraf', 981, 'Normal/Psychic', [120, 90, 70, 110, 70, 60], ['Hyper Voice', 'Psychic', 'Shadow Ball', 'Calm Mind']);

// ---------- Abilities ----------
const ABILITIES = {
  Gengar: 'Cursed Body', Spiritomb: 'Infiltrator', Weavile: 'Pressure', Dusknoir: 'Pressure', Giratina: 'Pressure', Noivern: 'Infiltrator',
  // Gen 1
  Venusaur: 'Chlorophyll', Charizard: 'Blaze', Blastoise: 'Torrent', Pikachu: 'Static', Raichu: 'Lightning Rod',
  Nidoqueen: 'Sheer Force', Nidoking: 'Sheer Force', Clefable: 'Magic Guard', Ninetales: 'Drought', Vileplume: 'Chlorophyll',
  Persian: 'Technician', Golduck: 'Swift Swim', Arcanine: 'Intimidate', Poliwrath: 'Water Absorb', Alakazam: 'Magic Guard',
  Machamp: 'Guts', Victreebel: 'Chlorophyll', Tentacruel: 'Clear Body', Golem: 'Sturdy', Rapidash: 'Flash Fire',
  Slowbro: 'Regenerator', Exeggutor: 'Chlorophyll', Hitmonlee: 'Reckless', Rhydon: 'Rock Head', Kangaskhan: 'Scrappy',
  Starmie: 'Natural Cure', Tauros: 'Intimidate', Gyarados: 'Intimidate', Lapras: 'Water Absorb', Vaporeon: 'Water Absorb',
  Jolteon: 'Volt Absorb', Aerodactyl: 'Rock Head', Snorlax: 'Thick Fat', Zapdos: 'Static', Moltres: 'Flame Body',
  Dragonite: 'Multiscale', Sandslash: 'Sand Rush', Primeape: 'Defiant', Kingler: 'Sheer Force', Electrode: 'Static',
  Hitmonchan: 'Iron Fist', Weezing: 'Levitate', 'Mr. Mime': 'Filter', Scyther: 'Technician', Pinsir: 'Moxie',
  Flareon: 'Guts', Omastar: 'Swift Swim', Kabutops: 'Swift Swim',
  // Gen 2
  Meganium: 'Overgrow', Typhlosion: 'Blaze', Feraligatr: 'Sheer Force', Crobat: 'Inner Focus', Ampharos: 'Static',
  Steelix: 'Sturdy', Scizor: 'Technician', Heracross: 'Guts', Skarmory: 'Sturdy', Houndoom: 'Flash Fire',
  Kingdra: 'Swift Swim', Tyranitar: 'Sand Stream', Bellossom: 'Chlorophyll', Quagsire: 'Unaware', Ursaring: 'Guts',
  Donphan: 'Sturdy', Azumarill: 'Huge Power',
  // Gen 3
  Sceptile: 'Overgrow', Blaziken: 'Speed Boost', Swampert: 'Torrent', Ludicolo: 'Swift Swim', Breloom: 'Technician',
  Aggron: 'Rock Head', Wailord: 'Water Veil', Flygon: 'Levitate', Whiscash: 'Oblivious', Claydol: 'Levitate',
  Cradily: 'Storm Drain', Armaldo: 'Swift Swim', Milotic: 'Marvel Scale', Absol: 'Super Luck', Salamence: 'Intimidate',
  Metagross: 'Clear Body', Mightyena: 'Intimidate', Exploud: 'Scrappy', Sharpedo: 'Speed Boost', Camerupt: 'Solid Rock',
  Altaria: 'Natural Cure', Crawdaunt: 'Adaptability', Walrein: 'Thick Fat', Kyogre: 'Drizzle', Groudon: 'Drought',
  Medicham: 'Pure Power',
  // Gen 4
  Torterra: 'Overgrow', Infernape: 'Iron Fist', Empoleon: 'Torrent', Staraptor: 'Reckless', Luxray: 'Intimidate',
  Roserade: 'Natural Cure', Gastrodon: 'Storm Drain', Honchkrow: 'Moxie', Garchomp: 'Rough Skin', Lucario: 'Inner Focus',
  Abomasnow: 'Snow Warning', Magnezone: 'Sturdy', Rhyperior: 'Solid Rock', Electivire: 'Motor Drive', Magmortar: 'Flame Body',
  Togekiss: 'Serene Grace', Mamoswine: 'Thick Fat', Gallade: 'Sharpness', Mismagius: 'Levitate', Bronzong: 'Levitate',
  Hippowdon: 'Sand Stream', Drapion: 'Sniper', Toxicroak: 'Dry Skin', Tangrowth: 'Regenerator', Leafeon: 'Chlorophyll',
  'Porygon-Z': 'Adaptability',
  // Gen 5
  Emboar: 'Reckless', Samurott: 'Torrent', Gigalith: 'Sand Stream', Excadrill: 'Mold Breaker', Conkeldurr: 'Guts',
  Seismitoad: 'Swift Swim', Krookodile: 'Moxie', Eelektross: 'Levitate', Chandelure: 'Flash Fire', Haxorus: 'Mold Breaker',
  Mienshao: 'Regenerator', Druddigon: 'Rough Skin', Bisharp: 'Defiant', Bouffalant: 'Sap Sipper', Braviary: 'Sheer Force',
  Hydreigon: 'Levitate', Volcarona: 'Flame Body', Liepard: 'Prankster', Lilligant: 'Chlorophyll', Scrafty: 'Intimidate',
  Carracosta: 'Solid Rock', Reuniclus: 'Magic Guard', Vanilluxe: 'Snow Warning', Jellicent: 'Water Absorb',
  Galvantula: 'Compound Eyes', Ferrothorn: 'Iron Barbs', Klinklang: 'Clear Body', Golurk: 'Iron Fist',
  // Gen 6
  Greninja: 'Protean', Talonflame: 'Gale Wings', Gogoat: 'Sap Sipper', Tyrantrum: 'Strong Jaw', Aurorus: 'Refrigerate',
  Sylveon: 'Pixilate', Hawlucha: 'Mold Breaker', Goodra: 'Sap Sipper', Avalugg: 'Sturdy', Delphox: 'Blaze',
  Dragalge: 'Adaptability', Clawitzer: 'Mega Launcher', Trevenant: 'Natural Cure',
  // Gen 7
  Incineroar: 'Intimidate', Primarina: 'Torrent', Lycanroc: 'Sand Rush', Mimikyu: 'Disguise', Decidueye: 'Overgrow',
  Vikavolt: 'Levitate', Bewear: 'Fluffy', Tsareena: 'Queenly Majesty',
  // Gen 8
  Rillaboom: 'Overgrow', Cinderace: 'Libero', Inteleon: 'Sniper', Corviknight: 'Mirror Armor', Dragapult: 'Clear Body',
  Barraskewda: 'Swift Swim', Toxtricity: 'Punk Rock', Grimmsnarl: 'Prankster', Copperajah: 'Sheer Force',
  // Gen 9
  Meowscarada: 'Protean', Skeledirge: 'Unaware', Quaquaval: 'Moxie', Espathra: 'Speed Boost', Veluza: 'Sharpness',
  Kingambit: 'Supreme Overlord', Baxcalibur: 'Thermal Exchange', Gholdengo: 'Good as Gold', Pawmot: 'Iron Fist',
  Garganacl: 'Purifying Salt', Armarouge: 'Flash Fire', Ceruledge: 'Flash Fire', Mabosstiff: 'Intimidate',
  Orthworm: 'Earth Eater', Dondozo: 'Unaware', Clodsire: 'Water Absorb', Dudunsparce: 'Serene Grace',
  // Expansion pack 2
  Arbok: 'Intimidate', Venomoth: 'Tinted Lens', Dewgong: 'Thick Fat', Jynx: 'Dry Skin', Lanturn: 'Volt Absorb',
  Hitmontop: 'Intimidate', Miltank: 'Thick Fat', Pelipper: 'Drizzle', Slaking: 'Truant', Sableye: 'Prankster',
  Mawile: 'Intimidate', Torkoal: 'Drought', Zebstrika: 'Sap Sipper', Scolipede: 'Speed Boost', Amoonguss: 'Regenerator',
  Toxapex: 'Regenerator', Araquanid: 'Water Bubble', Palossand: 'Water Compaction', Dhelmise: 'Steelworker',
  Drednaw: 'Strong Jaw', Centiskorch: 'Flash Fire', Obstagoon: 'Guts', "Sirfetch'd": 'Scrappy', Frosmoth: 'Ice Scales',
  Kilowattrel: 'Volt Absorb', Tinkaton: 'Mold Breaker', Annihilape: 'Defiant', Farigiraf: 'Armor Tail',
  // Expansion 3: curated Pokémon whose abilities are now in the engine
  Pidgeot: 'Big Pecks', Dugtrio: 'Arena Trap', Muk: 'Poison Touch', Cloyster: 'Shell Armor', Articuno: 'Snow Cloak',
  Espeon: 'Magic Bounce', Umbreon: 'Synchronize', Gardevoir: 'Trace', Gliscor: 'Hyper Cutter', Cofagrigus: 'Mummy',
  Archeops: 'Defeatist', Zekrom: 'Teravolt', Pyroar: 'Moxie', Gourgeist: 'Insomnia', Yveltal: 'Dark Aura',
  'Kommo-o': 'Bulletproof', Sandaconda: 'Sand Spit', Glimmora: 'Corrosion', Dodrio: 'Early Bird', Glaceon: 'Snow Cloak',
  Froslass: 'Snow Cloak', Darkrai: 'Bad Dreams', Escavalier: 'Shell Armor', Accelgor: 'Hydration', Chesnaught: 'Bulletproof',
  Mudsdale: 'Stamina', Salazzle: 'Corrosion', Golisopod: 'Emergency Exit', Hatterene: 'Magic Bounce'
};

const ABILITY_INFO = {
  'Adaptability': 'Same-type attack bonus is 2× instead of 1.5×.',
  'Blaze': 'Fire moves 1.5× stronger at 1/3 HP or less.',
  'Chlorophyll': 'Speed doubles in harsh sunlight.',
  'Clear Body': 'Foes cannot lower its stats.',
  'Compound Eyes': 'Moves are 1.3× more accurate.',
  Pressure: 'Moves aimed at it use 2 PP instead of 1.',
  Steadfast: 'Raises Speed by 1 each time it flinches.',
  'Tangled Feet': 'Evasion doubles while confused.',
  'Skill Link': 'Multi-hit moves always hit 5 times.',
  Stench: '10% chance to make the target flinch with its attacks.',
  'Cursed Body': '30% chance to disable a move that hits it.',
  Infiltrator: 'Ignores the foe’s Substitute, Reflect, Light Screen and Aurora Veil.',
  Damp: 'Stops Explosion, Self-Destruct, Mind Blown and Misty Explosion.',
  'Keen Eye': 'Its accuracy can’t be lowered, and it ignores the target’s evasion boosts.',
  "Mind's Eye": 'Hits Ghost types with Normal and Fighting moves; accuracy can’t be lowered.',
  'Suction Cups': 'Can’t be forced out by Roar, Whirlwind or Dragon Tail.',
  'Unseen Fist': 'Contact moves hit through Protect.',
  'Perish Body': 'When hit by a contact move, both Pokémon will faint in 3 turns.',
  'Aroma Veil': 'Immune to Taunt, Encore and Disable.',
  'Wonder Skin': 'Status moves aimed at it have at most 50% accuracy.',
  Illuminate: 'Its accuracy can’t be lowered, and it ignores the target’s evasion boosts.',
  'As One (Glastrier)': 'Raises Attack by 1 each time it knocks out a Pokémon.',
  'As One (Spectrier)': 'Raises Sp. Atk by 1 each time it knocks out a Pokémon.',
  'Surge Surfer': 'Doubles Speed on Electric Terrain.',
  'Pastel Veil': 'Can’t be poisoned.',
  'Defiant': 'Attack sharply rises when a foe lowers its stats.',
  'Disguise': 'The first hit only deals 1/8 of its max HP.',
  'Drizzle': 'Summons rain for 5 turns on entry.',
  'Drought': 'Summons harsh sunlight for 5 turns on entry.',
  'Dry Skin': 'Water moves heal it 1/4 HP; takes 1.25× from Fire.',
  'Earth Eater': 'Ground moves heal it 1/4 HP instead.',
  'Filter': 'Super-effective hits deal 0.75× damage.',
  'Flame Body': 'Contact may burn the attacker (30%).',
  'Flash Fire': 'Immune to Fire; absorbing one powers up its Fire moves 1.5×.',
  'Fluffy': 'Takes half damage from physical (contact) moves.',
  'Gale Wings': 'Flying moves get +1 priority at full HP.',
  'Good as Gold': "Immune to the foe's status moves.",
  'Guts': 'Attack 1.5× while statused; ignores the burn Attack drop.',
  'Huge Power': 'Doubles Attack.',
  'Inner Focus': 'Immune to Intimidate and flinching.',
  'Intimidate': "Lowers the foe's Attack by 1 on entry.",
  'Iron Barbs': 'Attackers making contact lose 1/8 of their max HP.',
  'Iron Fist': 'Punching moves 1.2× stronger.',
  'Levitate': 'Immune to Ground moves.',
  'Libero': 'Changes type to match the move it uses (once per entry).',
  'Lightning Rod': 'Immune to Electric; absorbing one raises Sp. Atk.',
  'Magic Guard': 'Only takes damage from attacks (no recoil, poison, burn, sand).',
  'Marvel Scale': 'Defense 1.5× while statused.',
  'Mega Launcher': 'Pulse and aura moves 1.5× stronger.',
  'Mirror Armor': 'Foes cannot lower its stats.',
  'Mold Breaker': "Its moves ignore the target's ability.",
  'Motor Drive': 'Immune to Electric; absorbing one raises Speed.',
  'Moxie': 'Attack rises by 1 after knocking out a foe.',
  'Multiscale': 'Takes half damage at full HP.',
  'Natural Cure': 'Cures its status when it switches out.',
  'Oblivious': 'Immune to Intimidate and Taunt.',
  'Overgrow': 'Grass moves 1.5× stronger at 1/3 HP or less.',
  'Pixilate': 'Normal moves become Fairy-type and 1.2× stronger.',
  'Prankster': 'Status moves get +1 priority (fail on Dark types).',
  'Protean': 'Changes type to match the move it uses (once per entry).',
  'Punk Rock': 'Sound moves 1.3× stronger.',
  'Pure Power': 'Doubles Attack.',
  'Purifying Salt': 'Immune to status; takes half damage from Ghost moves.',
  'Queenly Majesty': 'Foes cannot hit it with priority moves.',
  'Reckless': 'Recoil and crash moves 1.2× stronger.',
  'Refrigerate': 'Normal moves become Ice-type and 1.2× stronger.',
  'Regenerator': 'Restores 1/3 max HP when it switches out.',
  'Rock Head': 'Takes no recoil damage.',
  'Rough Skin': 'Attackers making contact lose 1/8 of their max HP.',
  'Sand Rush': 'Speed doubles in a sandstorm; immune to sand damage.',
  'Sand Stream': 'Summons a sandstorm for 5 turns on entry.',
  'Sap Sipper': 'Immune to Grass; absorbing one raises Attack.',
  'Scrappy': 'Normal and Fighting moves can hit Ghost types; immune to Intimidate.',
  'Serene Grace': 'Doubles the chance of secondary effects.',
  'Sharpness': 'Slicing moves 1.5× stronger.',
  'Sheer Force': 'Moves with secondary effects are 1.3× stronger but lose the effect.',
  'Sniper': 'Critical hits deal 2.25× instead of 1.5×.',
  'Snow Warning': 'Summons snow for 5 turns on entry.',
  'Solid Rock': 'Super-effective hits deal 0.75× damage.',
  'Speed Boost': 'Speed rises by 1 at the end of each turn.',
  'Static': 'Contact may paralyze the attacker (30%).',
  'Storm Drain': 'Immune to Water; absorbing one raises Sp. Atk.',
  'Strong Jaw': 'Biting moves 1.5× stronger.',
  'Sturdy': 'Survives any hit from full HP with 1 HP.',
  'Super Luck': 'Higher critical-hit ratio.',
  'Supreme Overlord': 'Moves 10% stronger for each fainted ally.',
  'Swift Swim': 'Speed doubles in rain.',
  'Technician': 'Moves of 60 power or less are 1.5× stronger.',
  'Thermal Exchange': 'Cannot be burned.',
  'Thick Fat': 'Takes half damage from Fire and Ice moves.',
  'Torrent': 'Water moves 1.5× stronger at 1/3 HP or less.',
  'Unaware': "Ignores the foe's stat changes.",
  'Volt Absorb': 'Electric moves heal it 1/4 HP instead.',
  'Water Absorb': 'Water moves heal it 1/4 HP instead.',
  'Water Veil': 'Cannot be burned.',
  'Armor Tail': 'Foes cannot hit it with priority moves.',
  'Ice Scales': 'Takes half damage from special moves.',
  'Steelworker': 'Steel moves 1.5× stronger.',
  'Tinted Lens': 'Not-very-effective moves deal double damage.',
  'Truant': 'Can only act every other turn.',
  'Water Bubble': 'Water moves 2× stronger; halves Fire damage; cannot be burned.',
  'Aerilate': 'Normal moves become Flying-type and 1.2× stronger.',
  'Aftermath': 'A contact move that knocks it out costs the attacker 1/4 HP.',
  'Analytic': 'Moves 1.3× stronger when it moves after the target.',
  'Battle Armor': 'Cannot be hit by critical hits.',
  'Beast Boost': 'Its highest stat rises after knocking out a foe.',
  'Bulletproof': 'Immune to ball and bomb moves.',
  'Chilling Neigh': 'Attack rises by 1 after knocking out a foe.',
  'Competitive': 'Sp. Atk sharply rises when a foe lowers its stats.',
  'Contrary': 'Stat changes are reversed.',
  'Dauntless Shield': 'Defense rises by 1 on entry.',
  'Dazzling': 'Foes cannot hit it with priority moves.',
  "Dragon's Maw": 'Dragon moves 1.5× stronger.',
  'Effect Spore': 'Contact may poison, paralyze or put the attacker to sleep (30%).',
  'Full Metal Body': 'Foes cannot lower its stats.',
  'Fur Coat': 'Takes half damage from physical moves.',
  'Galvanize': 'Normal moves become Electric-type and 1.2× stronger.',
  'Gooey': 'Contact lowers the attacker\'s Speed.',
  'Grim Neigh': 'Sp. Atk rises by 1 after knocking out a foe.',
  'Heatproof': 'Takes half damage from Fire moves.',
  'Hustle': 'Attack 1.5×, but physical moves are less accurate.',
  'Hydration': 'Cures its status at the end of each turn in rain.',
  'Hyper Cutter': 'Foes cannot lower its Attack.',
  'Ice Body': 'Restores 1/16 HP each turn in snow.',
  'Immunity': 'Cannot be poisoned.',
  'Insomnia': 'Cannot fall asleep.',
  'Intrepid Sword': 'Attack rises by 1 on entry.',
  'Justified': 'Attack rises when hit by a Dark move.',
  'Limber': 'Cannot be paralyzed.',
  'Magic Bounce': 'Reflects status moves back at the user.',
  'Magma Armor': 'Cannot be frozen.',
  'No Guard': 'Moves used by or against it never miss.',
  'Overcoat': 'Immune to sandstorm damage.',
  'Own Tempo': 'Immune to Intimidate and confusion.',
  'Poison Heal': 'Heals 1/8 HP each turn while poisoned instead of taking damage.',
  'Poison Point': 'Contact may poison the attacker (30%).',
  'Prism Armor': 'Super-effective hits deal 0.75× damage.',
  'Protosynthesis': 'In harsh sunlight its highest stat is boosted.',
  'Quick Feet': 'Speed 1.5× while statused.',
  'Rain Dish': 'Restores 1/16 HP each turn in rain.',
  'Rocky Payload': 'Rock moves 1.5× stronger.',
  'Sand Force': 'Rock, Ground and Steel moves 1.3× stronger in sand; immune to sand.',
  'Shed Skin': '1/3 chance to cure its status each turn.',
  'Shell Armor': 'Cannot be hit by critical hits.',
  'Shield Dust': 'Blocks the added effects of moves that hit it.',
  'Simple': 'Stat changes are doubled.',
  'Slush Rush': 'Speed doubles in snow.',
  'Solar Power': 'Sp. Atk 1.5× in sun, but loses 1/8 HP each turn.',
  'Soundproof': 'Immune to sound moves.',
  'Stamina': 'Defense rises when hit.',
  'Swarm': 'Bug moves 1.5× stronger at 1/3 HP or less.',
  'Sweet Veil': 'Cannot fall asleep.',
  'Tangling Hair': 'Contact lowers the attacker\'s Speed.',
  'Tough Claws': 'Physical (contact) moves 1.3× stronger.',
  'Transistor': 'Electric moves 1.3× stronger.',
  'Vital Spirit': 'Cannot fall asleep.',
  'Weak Armor': 'Physical hits lower Defense but sharply raise Speed.',
  'Well-Baked Body': 'Immune to Fire; absorbing one sharply raises Defense.',
  'White Smoke': 'Foes cannot lower its stats.',
  'Wonder Guard': 'Only super-effective moves can hit it.',
  // Expansion 3
  'Air Lock': 'Weather has no effect while it is in battle.',
  'Anger Point': 'Attack is maxed out when hit by a critical hit.',
  'Anger Shell': 'Below half HP: +1 Atk/SpA/Spe, −1 Def/SpD.',
  'Arena Trap': 'Grounded foes cannot switch out.',
  'Aura Break': 'Reverses Fairy Aura and Dark Aura.',
  'Bad Dreams': 'A sleeping foe loses 1/8 HP each turn.',
  'Battle Bond': 'Attack, Sp. Atk and Speed rise once after knocking out a foe.',
  'Beads of Ruin': "Lowers the foe's Sp. Def by 25%.",
  'Berserk': 'Sp. Atk rises when a hit drops it below half HP.',
  'Big Pecks': 'Foes cannot lower its Defense.',
  'Cloud Nine': 'Weather has no effect while it is in battle.',
  'Color Change': 'Becomes the type of the move that hit it.',
  'Comatose': 'Always drowsy: cannot get a status condition.',
  'Corrosion': 'Can poison Steel and Poison types.',
  'Cotton Down': "When hit, lowers the attacker's Speed.",
  'Dark Aura': 'Dark moves are 1.33× stronger for everyone.',
  'Defeatist': 'Attack and Sp. Atk are halved at half HP or less.',
  'Download': 'On entry raises Attack or Sp. Atk, whichever beats the foe\'s weaker defense.',
  'Early Bird': 'Wakes up twice as fast.',
  'Electric Surge': 'Sets Electric Terrain for 5 turns on entry.',
  'Electromorphosis': 'When hit, its next Electric move deals double damage.',
  'Emergency Exit': 'Switches out when a hit drops it below half HP.',
  'Fairy Aura': 'Fairy moves are 1.33× stronger for everyone.',
  'Flare Boost': 'Sp. Atk 1.5× while burned.',
  'Flower Gift': 'Attack and Sp. Def 1.5× in harsh sunlight.',
  'Forecast': 'Changes type with the weather.',
  'Grass Pelt': 'Defense 1.5× on Grassy Terrain.',
  'Grassy Surge': 'Sets Grassy Terrain for 5 turns on entry.',
  'Guard Dog': 'Intimidate raises its Attack instead of lowering it.',
  'Hadron Engine': 'Sets Electric Terrain; Sp. Atk 1.33× on it.',
  'Ice Face': 'The first physical hit is blocked; reforms in snow.',
  'Imposter': 'Transforms into the foe on entry.',
  'Innards Out': 'When knocked out, the attacker takes the damage dealt.',
  'Leaf Guard': 'Cannot get a status condition in harsh sunlight.',
  'Lingering Aroma': "Contact changes the attacker's ability to Lingering Aroma.",
  'Liquid Ooze': 'Draining moves hurt the attacker instead of healing it.',
  'Liquid Voice': 'Sound moves become Water-type.',
  'Long Reach': 'Its moves never make contact.',
  'Magnet Pull': 'Steel-type foes cannot switch out.',
  'Merciless': 'Always lands critical hits on poisoned targets.',
  'Misty Surge': 'Sets Misty Terrain for 5 turns on entry.',
  'Moody': 'Each turn one stat sharply rises and another falls.',
  'Mummy': "Contact changes the attacker's ability to Mummy.",
  'Mycelium Might': "Status moves go last but ignore the target's ability.",
  'Neutralizing Gas': 'Every other ability has no effect while it is in battle.',
  'Normalize': 'All its moves become Normal-type and 1.2× stronger.',
  'Opportunist': 'Copies any stat boosts the foe gets.',
  'Orichalcum Pulse': 'Sets harsh sunlight; Attack 1.33× in sun.',
  'Poison Touch': 'Its contact moves may poison the target (30%).',
  'Power Construct': 'Becomes Complete Forme at half HP or less.',
  'Psychic Surge': 'Sets Psychic Terrain for 5 turns on entry.',
  'Quark Drive': 'On Electric Terrain its highest stat is boosted.',
  'Rattled': 'Speed rises when hit by Bug, Dark or Ghost moves, or Intimidated.',
  'Sand Spit': 'Whips up a sandstorm when hit.',
  'Sand Veil': 'Harder to hit in a sandstorm.',
  'Schooling': 'Forms a powerful school above 1/4 HP.',
  'Seed Sower': 'Sets Grassy Terrain when hit.',
  'Shadow Shield': 'Takes half damage at full HP.',
  'Shadow Tag': 'Foes cannot switch out.',
  'Shields Down': 'Status-immune shell above half HP; faster, stronger core below.',
  'Slow Start': 'Attack and Speed are halved for its first 5 turns.',
  'Snow Cloak': 'Harder to hit in snow.',
  'Soul-Heart': 'Sp. Atk rises whenever a Pokémon faints.',
  'Stakeout': 'Double damage to a foe that just switched in.',
  'Stall': 'Always moves last.',
  'Stance Change': 'Blade Forme when attacking, Shield Forme for status moves.',
  'Steam Engine': 'Speed maxes out when hit by Fire or Water moves.',
  'Steely Spirit': 'Steel moves 1.5× stronger.',
  'Sword of Ruin': "Lowers the foe's Defense by 25%.",
  'Synchronize': 'Passes burn, paralysis or poison back to the foe that caused it.',
  'Tablets of Ruin': "Lowers the foe's Attack by 25%.",
  'Teravolt': "Its moves ignore the target's ability.",
  'Toxic Boost': 'Attack 1.5× while poisoned.',
  'Toxic Chain': 'Its moves may badly poison the target (30%).',
  'Trace': "Copies the foe's ability on entry.",
  'Triage': 'Healing and draining moves get +3 priority.',
  'Turboblaze': "Its moves ignore the target's ability.",
  'Vessel of Ruin': "Lowers the foe's Sp. Atk by 25%.",
  'Victory Star': 'Moves are 10% more accurate.',
  'Wandering Spirit': 'Swaps abilities with an attacker that makes contact.',
  'Water Compaction': 'Defense sharply rises when hit by a Water move.',
  'Wimp Out': 'Switches out when a hit drops it below half HP.',
  'Wind Power': 'When hit by a wind move, its next Electric move deals double damage.',
  'Wind Rider': 'Immune to wind moves; absorbing one raises Attack.',
  'Zen Mode': 'Becomes Zen Mode (Fire/Psychic, special attacker) at half HP or less.',
  'Zero to Hero': 'Becomes Hero Form after switching out.'
};

// ---------- Hard mode: setup moves are swapped for these ----------
const HARD_MOVES = {
  Raichu: 'Grass Knot', Clefable: 'Thunderbolt', Ninetales: 'Will-O-Wisp', Dugtrio: 'Shadow Claw',
  Golduck: 'Focus Blast', Poliwrath: 'Earthquake', Alakazam: 'Energy Ball', Victreebel: 'Knock Off', Cloyster: 'Ice Shard',
  Rhydon: 'Ice Punch', Gyarados: 'Ice Fang', Snorlax: 'Fire Punch', Dragonite: 'Fire Punch', Feraligatr: 'Aqua Jet',
  Espeon: 'Grass Knot', Scizor: 'Superpower', Houndoom: 'Sucker Punch', Kingdra: 'Ice Beam', Tyranitar: 'Fire Punch',
  Blaziken: 'Thunder Punch', Gardevoir: 'Shadow Ball', Flygon: 'Stone Edge', Whiscash: 'Zen Headbutt', Armaldo: 'Knock Off',
  Absol: 'Superpower', Salamence: 'Rock Slide', Spiritomb: 'Sucker Punch', Garchomp: 'Fire Fang', Lucario: 'Extreme Speed',
  Weavile: 'Poison Jab', Togekiss: 'Flamethrower', Gliscor: 'Stone Edge', Gallade: 'Knock Off', Excadrill: 'X-Scissor',
  Cofagrigus: 'Psychic', Zoroark: 'Sludge Bomb', Chandelure: 'Psychic', Haxorus: 'Iron Tail', Bisharp: 'Psycho Cut',
  Bouffalant: 'Superpower', Braviary: 'Rock Slide', Hydreigon: 'Earth Power', Volcarona: 'Psychic', Zekrom: 'Dragon Claw',
  Talonflame: 'Will-O-Wisp', Gogoat: 'Rock Slide', Tyrantrum: 'Crunch', Aurorus: 'Earth Power', Sylveon: 'Hyper Voice',
  Hawlucha: 'Stone Edge', Incineroar: 'Earthquake', Primarina: 'Energy Ball', Lycanroc: 'Drill Run', Mimikyu: 'Drain Punch',
  'Kommo-o': 'Earthquake', Corviknight: 'Body Slam', Sandaconda: 'Iron Head', Espathra: 'Energy Ball',
  Kingambit: 'Stone Edge', Baxcalibur: 'Earthquake', Gholdengo: 'Thunderbolt', Sandslash: 'X-Scissor', Primeape: 'Earthquake',
  Dodrio: 'Drill Run', Kingler: 'Rock Slide', Hitmonchan: 'Thunder Punch', 'Mr. Mime': 'Shadow Ball', Scyther: 'Night Slash',
  Pinsir: 'Earthquake', Omastar: 'Ancient Power', Kabutops: 'Knock Off', Bellossom: 'Sludge Bomb', Ursaring: 'Fire Punch',
   Crawdaunt: 'X-Scissor', Kyogre: 'Scald', Groudon: 'Thunder Punch', Mismagius: 'Energy Ball',
  Drapion: 'Fire Fang', Toxicroak: 'Ice Punch', Leafeon: 'X-Scissor', Glaceon: 'Hyper Voice', 'Porygon-Z': 'Dark Pulse',
  Darkrai: 'Focus Blast', Liepard: 'Iron Tail', Lilligant: 'Leaf Storm', Scrafty: 'High Jump Kick', Carracosta: 'Earthquake',
  Reuniclus: 'Shadow Ball', Escavalier: 'Drill Run', Klinklang: 'Facade', Chesnaught: 'Earthquake', Delphox: 'Shadow Ball',
  Florges: 'Energy Ball', Decidueye: 'Brave Bird', Salazzle: 'Will-O-Wisp', Bewear: 'Ice Punch', Toxtricity: 'Discharge',
  Hatterene: 'Mystical Fire', Grimmsnarl: 'Play Rough', Garganacl: 'Iron Head', Armarouge: 'Shadow Ball', Ceruledge: 'Psycho Cut',
   Orthworm: 'Body Slam', Dondozo: 'Rock Slide', Dudunsparce: 'Thunderbolt',
  // Expansion pack 2
  Arbok: 'Knock Off', Venomoth: 'Psychic', Mawile: 'Fire Fang', Scolipede: 'Rock Slide', Drednaw: 'Earthquake',
  Centiskorch: 'Power Whip', Frosmoth: 'Hurricane', Tinkaton: 'Stone Edge', Annihilape: 'Earthquake', Farigiraf: 'Thunderbolt'
};
