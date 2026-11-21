// A small seeded random generator (mulberry32), so a screenshot scene staged
// with a seed always plays out the same way. The game itself uses it for the
// guards' idle sway and the sparkle on the relics — nothing the player can
// exploit, everything reproducible.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick an integer in [min, max] from the generator.
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// Pick one element of an array.
export function randPick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}
