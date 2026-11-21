// The three floors of the Ashen Museum, as tile maps. Legend:
//   '#' wall — blocks movement and sight
//   '.' floor
//   'R' rug — quiet floor, running on it makes no noise
//   'S' shadow — dark floor, guards notice you more slowly there
//   'C' crate, 'P' plant — tall cover, blocks movement and sight
//   'r' relic to steal, 'E' exit door, '@' where the player starts
// Guards patrol the waypoint lists (tile coordinates); every waypoint must
// be a walkable tile. parseLevel turns a map into the grids the world uses.
export const LEVELS = [
  {
    name: 'The Grand Hall',
    subtitle: 'Three relics. Three guards. Mind the cones.',
    map: [
      '##############################',
      '#............................#',
      '#..C......P..##..r...........#',
      '#............##..........C...#',
      '#..####......##......####....#',
      '#..#.......P.##..P.......#...#',
      '#..#..C.......##......C..#...#',
      '#..#..........##.........#...#',
      '#..####..P....##....P.####...#',
      '#.........C...##...C.........#',
      '#..P....####..##..####....P..#',
      '#.......#.....##.....#.......#',
      '#..C....#..r..##..r..#....C..#',
      '#.......#.....##.....#.......#',
      '#..P....####..##..####....P..#',
      '#............##..............#',
      '#..@......................E..#',
      '##############################',
    ],
    guards: [
      { waypoints: [[5, 1], [12, 1], [12, 3], [5, 3]] },
      { waypoints: [[18, 1], [24, 1], [24, 3], [18, 3]] },
      { waypoints: [[4, 13], [7, 13], [7, 15], [4, 15]] },
    ],
  },
  {
    name: 'The Vault',
    subtitle: 'Rugs hush your steps. Shadows hide you. Four guards.',
    map: [
      '##############################',
      '#....R......####......R......#',
      '#....R..C...#..#...C..R..r...#',
      '#....R......#..#......R......#',
      '#..####..P..#..#..P..####....#',
      '#..#........#..#........#....#',
      '#..#..C..####..####..C..#....#',
      '#..#.....#........#.....#....#',
      '#..#..P..#.r....r.#..P..#....#',
      '#..#.....#........#.....#....#',
      '#..####..#.S....S.#..####....#',
      '#........#........#..........#',
      '#..C..P..####..####..P..C....#',
      '#............................#',
      '#..P......S....S......P......#',
      '#....C..........C.........E..#',
      '#..@.........................#',
      '##############################',
    ],
    guards: [
      { waypoints: [[5, 1], [11, 1], [11, 3], [5, 3]] },
      { waypoints: [[18, 1], [26, 1], [26, 3], [18, 3]] },
      { waypoints: [[11, 7], [17, 7], [17, 11], [11, 11]] },
      { waypoints: [[18, 13], [26, 13], [26, 15], [18, 15]] },
    ],
  },
  {
    name: 'The Rooftop Garden',
    subtitle: 'Five guards under the moon. The last three relics.',
    map: [
      '##############################',
      '#..P..........S...........P..#',
      '#.........r.......C..........#',
      '#..####..S....####....S..###.#',
      '#..#.............#.........#.#',
      '#..#..P....C....#..P......#..#',
      '#..#........P...#......C..#..#',
      '#..####..S....####..S..####..#',
      '#............................#',
      '#..P....C....S....C....P.....#',
      '#........####..####..........#',
      '#..r....#........#....r......#',
      '#.......#...S....#...........#',
      '#..####.#........#.####......#',
      '#......#....C....#...........#',
      '#..P...#....S....#...C....E..#',
      '#..@.........................#',
      '##############################',
    ],
    guards: [
      { waypoints: [[5, 1], [12, 1], [12, 2], [5, 2]] },
      { waypoints: [[21, 1], [25, 1], [25, 2], [21, 2]] },
      { waypoints: [[5, 9], [7, 9], [7, 10], [5, 10]] },
      { waypoints: [[18, 11], [24, 11], [24, 14], [18, 14]] },
      { waypoints: [[8, 15], [15, 15], [15, 16], [8, 16]] },
    ],
  },
];

const BLOCKS_MOVE = new Set(['#', 'C', 'P']);
const BLOCKS_SIGHT = new Set(['#', 'C', 'P']);

// Turn one level definition into the grids and lists the world simulates.
// Tiles stay as characters; walkable and sight-blocking are answered from
// the sets above. Relics, the exit and the player start come out as pixel
// positions (tile centres).
export function parseLevel(def) {
  const rows = def.map.length;
  const cols = def.map[0].length;
  const tiles = def.map.map((row) => row.split(''));
  const relics = [];
  let exit = null;
  let playerStart = null;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const ch = tiles[y][x];
      if (ch === 'r') relics.push({ tx: x, ty: y, taken: false });
      if (ch === 'E') exit = { tx: x, ty: y };
      if (ch === '@') playerStart = { tx: x, ty: y };
    }
  }
  const tileAt = (tx, ty) => {
    if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) return '#';
    return tiles[ty][tx];
  };
  return {
    name: def.name,
    subtitle: def.subtitle,
    rows,
    cols,
    tiles,
    relics,
    exit,
    playerStart,
    tileAt,
    walkable(tx, ty) {
      return !BLOCKS_MOVE.has(tileAt(tx, ty));
    },
    blocksSight(tx, ty) {
      return BLOCKS_SIGHT.has(tileAt(tx, ty));
    },
    isRug(tx, ty) {
      return tileAt(tx, ty) === 'R';
    },
    isShadow(tx, ty) {
      return tileAt(tx, ty) === 'S';
    },
  };
}
