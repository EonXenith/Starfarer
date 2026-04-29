// Procedural galaxy generation — greedy anchor-based for guaranteed connectivity
import { starSystems, GALAXY_SEED, PROCEDURAL_SYSTEM_COUNT, GALAXY } from './data.js';

function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const PREFIXES = ["Vor", "Kel", "Mira", "Zen", "Tal", "Quil", "Drex", "Nym", "Ryl", "Solv", "Ith", "Brak"];
const SUFFIXES = ["a", "ix", "is", "or", "an", "ek", "us", "yn", "ar", "im"];

const STAR_TYPE_WEIGHTS = [
  { type: "M", weight: 0.40, color: 0xff5544 },
  { type: "K", weight: 0.15, color: 0xffaa55 },
  { type: "G", weight: 0.15, color: 0xffeeaa },
  { type: "F", weight: 0.10, color: 0xfff8dd },
  { type: "A", weight: 0.10, color: 0xddddff },
  { type: "B", weight: 0.05, color: 0xaaccff },
  { type: "O", weight: 0.05, color: 0x99bbff }
];

const FLAVOR_TEMPLATES = [
  "A {adj} system around a class {type} star.",
  "{adj2} worlds circle a {type}-type primary.",
  "A {adj} {type}-class star on the galactic disc.",
  "Quiet and remote. A {adj} {type} dwarf.",
  "Surveys indicate {adj} conditions around this {type} star."
];

const ADJECTIVES = ["quiet", "turbulent", "ancient", "young", "barren", "fertile", "windswept", "frozen", "volatile", "stable", "dim", "radiant"];
const ADJECTIVES2 = ["Several", "A few", "Numerous", "Scattered", "Clustered"];

function pickWeighted(rng, items) {
  const total = items.reduce((a, b) => a + b.weight, 0);
  let r = rng() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function generateName(rng, takenNames) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const prefix = PREFIXES[Math.floor(rng() * PREFIXES.length)];
    const suffix = SUFFIXES[Math.floor(rng() * SUFFIXES.length)];
    let name = prefix + suffix;
    if (rng() < 0.2) {
      name += "-" + (2 + Math.floor(rng() * 7));
    }
    if (!takenNames.has(name.toLowerCase())) {
      return name;
    }
  }
  return "Sys-" + Math.floor(rng() * 99999);
}

function generateFlavor(rng, starType) {
  const template = FLAVOR_TEMPLATES[Math.floor(rng() * FLAVOR_TEMPLATES.length)];
  const adj = ADJECTIVES[Math.floor(rng() * ADJECTIVES.length)];
  const adj2 = ADJECTIVES2[Math.floor(rng() * ADJECTIVES2.length)];
  return template.replace("{adj}", adj).replace("{adj2}", adj2).replace(/\{type\}/g, starType);
}

// Find the nearest spiral arm angle at a given position
function nearestArmAngle(x, z) {
  const r = Math.sqrt(x * x + z * z);
  const theta = Math.atan2(z, x);
  if (r < GALAXY.armScale) return theta;

  const totalAngle = GALAXY.armTurns * 2 * Math.PI;
  let bestDiff = Infinity;
  let bestArmAngle = theta;

  for (let arm = 0; arm < GALAXY.arms; arm++) {
    // Invert the spiral: at radius r, what angle does this arm pass through?
    const t = Math.log(r / GALAXY.armScale) / (GALAXY.armPitch * totalAngle);
    if (t < 0 || t > 1) continue;
    const armAngle = t * totalAngle + GALAXY.armBases[arm];
    // Wrap angle difference
    let diff = theta - armAngle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    if (Math.abs(diff) < bestDiff) {
      bestDiff = Math.abs(diff);
      bestArmAngle = armAngle;
    }
  }
  return bestArmAngle;
}

export function generateProceduralSystems() {
  const rng = mulberry32(GALAXY_SEED);
  const count = PROCEDURAL_SYSTEM_COUNT;

  const placed = starSystems.map(s => ({ x: s.position.x, y: s.position.y || 0, z: s.position.z }));
  const takenNames = new Set(starSystems.map(s => s.name.toLowerCase()));
  const systems = [];

  for (let i = 0; i < count; i++) {
    let x, z, y, valid = false;

    for (let attempt = 0; attempt < 50; attempt++) {
      // Pick a random anchor from placed systems
      const anchorIdx = Math.floor(rng() * placed.length);
      const anchor = placed[anchorIdx];

      // Place at distance [10, 17] from anchor
      const dist = 10 + rng() * 7;

      // Bias angle toward nearest arm direction (~70% of the time)
      let angle;
      if (rng() < 0.7) {
        // Compute tangent of nearest arm at anchor position
        const armAngle = nearestArmAngle(anchor.x, anchor.z);
        const posAngle = Math.atan2(anchor.z, anchor.x);
        // Spiral tangent is roughly perpendicular to radial + arm pitch
        const tangent = armAngle + Math.PI / 2;
        // Bias toward tangent direction with noise
        angle = tangent + (rng() - 0.5) * Math.PI * 0.8;
      } else {
        angle = rng() * Math.PI * 2;
      }

      x = anchor.x + Math.cos(angle) * dist;
      z = anchor.z + Math.sin(angle) * dist;
      y = (rng() - 0.5) * 2 * GALAXY.discThickness;

      // Check: within 250 ly disc
      if (Math.sqrt(x * x + z * z) > GALAXY.discRadius) continue;

      // Check: not within 4 ly of existing
      valid = true;
      for (const p of placed) {
        const dx = x - p.x;
        const dz = z - p.z;
        if (Math.sqrt(dx * dx + dz * dz) < 4) {
          valid = false;
          break;
        }
      }
      if (valid) break;
    }

    if (!valid) continue;
    placed.push({ x, y, z });

    const starInfo = pickWeighted(rng, STAR_TYPE_WEIGHTS);
    const name = generateName(rng, takenNames);
    takenNames.add(name.toLowerCase());

    const baseColor = starInfo.color;
    const r = ((baseColor >> 16) & 0xff) + Math.floor((rng() - 0.5) * 20);
    const g = ((baseColor >> 8) & 0xff) + Math.floor((rng() - 0.5) * 20);
    const b = (baseColor & 0xff) + Math.floor((rng() - 0.5) * 20);
    const starColor = (Math.max(0, Math.min(255, r)) << 16) |
                      (Math.max(0, Math.min(255, g)) << 8) |
                      Math.max(0, Math.min(255, b));

    systems.push({
      id: `sys_${String(i + 13).padStart(3, '0')}`,
      name,
      position: { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, z: Math.round(z * 10) / 10 },
      starType: starInfo.type,
      starColor,
      isHandAuthored: false,
      seed: GALAXY_SEED * 1000 + i,
      flavor: generateFlavor(rng, starInfo.type),
      visited: false,
      scanned: false
    });
  }

  // Flood-fill verification from Sol
  const allSystems = [...starSystems, ...systems];
  const reachable = new Set();
  const queue = ['sol'];
  reachable.add('sol');
  while (queue.length > 0) {
    const currentId = queue.shift();
    const current = allSystems.find(s => s.id === currentId);
    if (!current) continue;
    for (const other of allSystems) {
      if (reachable.has(other.id)) continue;
      const dx = current.position.x - other.position.x;
      const dz = current.position.z - other.position.z;
      if (Math.sqrt(dx * dx + dz * dz) <= 18) {
        reachable.add(other.id);
        queue.push(other.id);
      }
    }
  }

  return systems.filter(s => {
    if (!reachable.has(s.id)) {
      console.warn(`Galaxy gen: ${s.id} (${s.name}) unreachable, skipping`);
      return false;
    }
    return true;
  });
}
