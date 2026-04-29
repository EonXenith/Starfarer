// Procedural planet generation — seeded, deterministic, no Math.random()
import * as THREE from 'three';

function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const PLANET_TYPES = ['rocky', 'ocean', 'desert', 'ice', 'gas', 'lava', 'toxic'];
const TYPE_WEIGHTS = [0.22, 0.18, 0.16, 0.14, 0.15, 0.07, 0.08];

const TYPE_PALETTES = {
  rocky: { base: [[0x8c, 0x7e, 0x6d], [0x6a, 0x5c, 0x4e], [0x99, 0x88, 0x77], [0x77, 0x66, 0x55]], radius: [0.4, 0.9] },
  ocean: { base: [[0x22, 0x66, 0xaa], [0x33, 0x88, 0xbb], [0x11, 0x55, 0x88], [0x44, 0x99, 0xcc]], radius: [0.7, 1.1] },
  desert: { base: [[0xcc, 0x99, 0x55], [0xdd, 0x88, 0x44], [0xbb, 0x77, 0x33], [0xee, 0xaa, 0x66]], radius: [0.6, 1.0] },
  ice: { base: [[0xcc, 0xdd, 0xee], [0xaa, 0xcc, 0xdd], [0xdd, 0xee, 0xff], [0x99, 0xbb, 0xcc]], radius: [0.4, 0.8] },
  gas: { base: [[0xdd, 0xaa, 0x77], [0xcc, 0x88, 0x55], [0xee, 0xcc, 0x99], [0xbb, 0x99, 0x66]], radius: [1.6, 3.0] },
  lava: { base: [[0x33, 0x22, 0x22], [0x44, 0x11, 0x00], [0x22, 0x11, 0x11], [0x55, 0x22, 0x11]], radius: [0.4, 0.8] },
  toxic: { base: [[0x77, 0xaa, 0x44], [0x88, 0xbb, 0x33], [0x66, 0x99, 0x22], [0x99, 0xcc, 0x55]], radius: [0.6, 1.0] }
};

const SOL_PALETTES = [
  { name: "Mars", colors: [[0xcc, 0x66, 0x44], [0xaa, 0x44, 0x22], [0xdd, 0x77, 0x55]] },
  { name: "Earth", colors: [[0x44, 0x88, 0xcc], [0x33, 0x77, 0xaa], [0x55, 0x99, 0xdd]] },
  { name: "Venus", colors: [[0xdd, 0xb8, 0x7a], [0xcc, 0xaa, 0x66], [0xee, 0xcc, 0x88]] },
  { name: "Jupiter", colors: [[0xdd, 0xaa, 0x77], [0xcc, 0x99, 0x66], [0xee, 0xbb, 0x88]] },
  { name: "Neptune", colors: [[0x44, 0x66, 0xdd], [0x33, 0x55, 0xbb], [0x55, 0x77, 0xee]] }
];

const FAMILIARITY_FLAVORS = [
  "Eerily reminiscent of {planet} — but the hues are all wrong.",
  "Like {planet} reflected in a funhouse mirror. The colors shifted, alien.",
  "A twin of {planet}, painted by a different hand.",
  "Something about this world whispers of {planet} — yet nothing matches.",
  "The ghost of {planet}, draped in unfamiliar light."
];

function pickWeighted(rng, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

function lerp(a, b, t) { return a + (b - a) * t; }

function jitterColor(rgb, rng, amount) {
  return rgb.map(c => Math.max(0, Math.min(255, c + (rng() - 0.5) * 2 * amount)));
}

function rgbToHex(rgb) {
  return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
}

function hueRotate(rgb, degrees) {
  const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
  const cos = Math.cos(degrees * Math.PI / 180);
  const sin = Math.sin(degrees * Math.PI / 180);
  const nr = r * (0.213 + cos * 0.787 - sin * 0.213) + g * (0.715 - cos * 0.715 - sin * 0.715) + b * (0.072 - cos * 0.072 + sin * 0.928);
  const ng = r * (0.213 - cos * 0.213 + sin * 0.143) + g * (0.715 + cos * 0.285 + sin * 0.140) + b * (0.072 - cos * 0.072 - sin * 0.283);
  const nb = r * (0.213 - cos * 0.213 - sin * 0.787) + g * (0.715 - cos * 0.715 + sin * 0.715) + b * (0.072 + cos * 0.928 + sin * 0.072);
  return [
    Math.max(0, Math.min(255, Math.round(nr * 255))),
    Math.max(0, Math.min(255, Math.round(ng * 255))),
    Math.max(0, Math.min(255, Math.round(nb * 255)))
  ];
}

function generateFlavorText(type, rng) {
  const flavors = {
    rocky: [
      "A barren world of craters and dust, silent under an empty sky.",
      "Wind-carved canyons cut through ancient stone on this airless rock.",
      "Pockmarked and grey, this world has endured eons of bombardment.",
      "A desolate sphere of iron and regolith."
    ],
    ocean: [
      "A pale ocean world with auroral storms at both poles.",
      "Endless seas shimmer beneath a thin atmosphere of nitrogen and vapor.",
      "Deep trenches and volcanic ridges hide beneath the global ocean.",
      "Water world. No land, just endless blue."
    ],
    desert: [
      "Vast dune seas stretch from pole to pole under a copper sky.",
      "Sand and wind have scoured this world smooth over millions of years.",
      "A world of rust and heat, where dust devils dance on the horizon.",
      "Bone-dry and sun-blasted. Even the rocks look thirsty."
    ],
    ice: [
      "A frozen shell of nitrogen ice, cracked by tidal forces.",
      "Glaciers of methane crawl across this frigid world's surface.",
      "White and silent. The ice runs kilometers deep.",
      "A snowball world, glittering in the starlight."
    ],
    gas: [
      "Immense bands of cloud wrap this giant in layers of cream and rust.",
      "A churning atmosphere of hydrogen and helium, deeper than worlds.",
      "Storm systems larger than rocky planets rage across its face.",
      "A gas giant of staggering scale, beautiful and untouchable."
    ],
    lava: [
      "Molten rivers of magma trace bright veins across the dark surface.",
      "Tidally tortured, this world's crust is in constant upheaval.",
      "A hellworld. The surface glows with the heat of its own making.",
      "Volcanic and violent, wreathed in sulfurous haze."
    ],
    toxic: [
      "Dense clouds of chlorine and ammonia shroud a corroded surface.",
      "A sickly green atmosphere hides a world of acid lakes.",
      "Toxic beyond measure. Even the rocks dissolve here.",
      "The air itself is poison. A world only machines could love."
    ]
  };
  const options = flavors[type];
  return options[Math.floor(rng() * options.length)];
}

function createGasBandTexture(rng, palette) {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const bandCount = 5 + Math.floor(rng() * 6);
  const bandHeight = 64 / bandCount;

  for (let i = 0; i < bandCount; i++) {
    const colorIdx = Math.floor(rng() * palette.length);
    const color = jitterColor(palette[colorIdx], rng, 30);
    ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
    ctx.fillRect(0, i * bandHeight, 1, bandHeight + 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createRingTexture(rng, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');

  for (let x = 0; x < 256; x++) {
    const t = x / 256;
    const alpha = (rng() * 0.3 + 0.2) * (1.0 - Math.abs(t - 0.5) * 1.5);
    const jittered = jitterColor(color, rng, 20);
    ctx.fillStyle = `rgba(${jittered[0]},${jittered[1]},${jittered[2]},${Math.max(0, alpha)})`;
    ctx.fillRect(x, 0, 1, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createPlanetMesh(planet) {
  const group = new THREE.Group();
  // Reset RNG for deterministic mesh generation
  const rng = mulberry32(planet._meshSeed);

  let material;
  if (planet.type === 'gas') {
    const palette = TYPE_PALETTES.gas.base;
    const bandTex = createGasBandTexture(rng, planet._palette || palette);
    material = new THREE.MeshStandardMaterial({
      map: bandTex,
      roughness: 0.8,
      metalness: 0.1
    });
  } else {
    const geo = new THREE.IcosahedronGeometry(1, 4);
    const colors = [];
    const pos = geo.attributes.position;
    const palette = planet._palette || TYPE_PALETTES[planet.type].base;

    for (let i = 0; i < pos.count; i++) {
      const colorIdx = Math.floor(rng() * palette.length);
      const jittered = jitterColor(palette[colorIdx], rng, 25);
      colors.push(jittered[0] / 255, jittered[1] / 255, jittered[2] / 255);
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const matOpts = {
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.05
    };

    if (planet.type === 'lava') {
      matOpts.emissive = new THREE.Color(0x441100);
      matOpts.emissiveIntensity = 0.3;
    }

    material = new THREE.MeshStandardMaterial(matOpts);
    const mesh = new THREE.Mesh(geo, material);
    mesh.scale.setScalar(planet.radius);
    mesh.rotation.z = planet.axialTilt;
    group.add(mesh);

    if (planet.hasAtmosphere) {
      const atmosGeo = new THREE.SphereGeometry(1.08, 32, 32);
      const atmosMat = new THREE.MeshStandardMaterial({
        color: planet.atmosphereColor,
        transparent: true,
        opacity: 0.18,
        roughness: 1,
        metalness: 0,
        side: THREE.FrontSide
      });
      const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
      atmosMesh.scale.setScalar(planet.radius);
      group.add(atmosMesh);
    }

    if (planet.hasRings) {
      const ringGeo = new THREE.RingGeometry(
        planet.radius * planet.ringInner,
        planet.radius * planet.ringOuter,
        64
      );
      const rgb = [(planet.ringColor >> 16) & 0xff, (planet.ringColor >> 8) & 0xff, planet.ringColor & 0xff];
      const ringTex = createRingTexture(rng, rgb);
      const ringMat = new THREE.MeshStandardMaterial({
        map: ringTex,
        transparent: true,
        side: THREE.DoubleSide,
        roughness: 0.9,
        metalness: 0.1
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2 + planet.axialTilt * 0.3;
      group.add(ring);
    }

    group.userData.planet = planet;
    return group;
  }

  // Gas giant path (with map texture)
  const geo = new THREE.SphereGeometry(1, 32, 32);
  const mesh = new THREE.Mesh(geo, material);
  mesh.scale.setScalar(planet.radius);
  mesh.rotation.z = planet.axialTilt;
  group.add(mesh);

  if (planet.hasAtmosphere) {
    const atmosGeo = new THREE.SphereGeometry(1.08, 32, 32);
    const atmosMat = new THREE.MeshStandardMaterial({
      color: planet.atmosphereColor,
      transparent: true,
      opacity: 0.12,
      roughness: 1,
      metalness: 0,
      side: THREE.FrontSide
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    atmosMesh.scale.setScalar(planet.radius);
    group.add(atmosMesh);
  }

  if (planet.hasRings) {
    const ringGeo = new THREE.RingGeometry(
      planet.radius * planet.ringInner,
      planet.radius * planet.ringOuter,
      64
    );
    const rgb = [(planet.ringColor >> 16) & 0xff, (planet.ringColor >> 8) & 0xff, planet.ringColor & 0xff];
    const ringTex = createRingTexture(rng, rgb);
    const ringMat = new THREE.MeshStandardMaterial({
      map: ringTex,
      transparent: true,
      side: THREE.DoubleSide,
      roughness: 0.9,
      metalness: 0.1
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2 + planet.axialTilt * 0.3;
    group.add(ring);
  }

  group.userData.planet = planet;
  return group;
}

export function generateSystemPlanets(system) {
  const rng = mulberry32(system.seed);
  const planetCount = 3 + Math.floor(rng() * 6); // 3-8
  const planets = [];

  for (let i = 0; i < planetCount; i++) {
    const planetRng = mulberry32(system.seed * 1000 + i);
    const typeIdx = pickWeighted(planetRng, TYPE_WEIGHTS);
    const type = PLANET_TYPES[typeIdx];
    const palette = TYPE_PALETTES[type];

    const radiusRange = palette.radius;
    const radius = lerp(radiusRange[0], radiusRange[1], planetRng());
    const orbitRadius = 8 + i * 5 + planetRng() * 3;
    const orbitSpeed = 0.002 / Math.sqrt(orbitRadius / 8);
    const rotationSpeed = 0.002 + planetRng() * 0.004;
    const axialTilt = planetRng() * 0.8;

    const baseColorIdx = Math.floor(planetRng() * palette.base.length);
    const baseColor = rgbToHex(jitterColor(palette.base[baseColorIdx], planetRng, 15));

    let hasAtmosphere = false;
    let atmosphereColor = null;
    if (type === 'ocean' || type === 'gas' || type === 'toxic') {
      hasAtmosphere = true;
    } else if (type === 'desert' || type === 'ice' || type === 'lava') {
      hasAtmosphere = planetRng() > 0.5;
    }

    if (hasAtmosphere) {
      const ac = jitterColor(palette.base[0], planetRng, 40);
      atmosphereColor = rgbToHex(ac);
    }

    let hasRings = false;
    let ringInner = 1.4, ringOuter = 2.2, ringColor = 0xaa9977;
    if (type === 'gas') {
      hasRings = planetRng() > 0.4;
    } else {
      hasRings = planetRng() > 0.92;
    }
    if (hasRings) {
      ringInner = 1.3 + planetRng() * 0.3;
      ringOuter = ringInner + 0.6 + planetRng() * 0.8;
      const rc = jitterColor(palette.base[0], planetRng, 30);
      ringColor = rgbToHex(rc);
    }

    let bandColor = null;
    if (type === 'gas') {
      const bc = jitterColor(palette.base[1], planetRng, 20);
      bandColor = rgbToHex(bc);
    }

    // Familiarity dial — 7% chance
    let flavor = null;
    let planetPalette = null;
    let isFamiliar = false;
    if (planetRng() < 0.07) {
      isFamiliar = true;
      const solRef = SOL_PALETTES[Math.floor(planetRng() * SOL_PALETTES.length)];
      const hueShift = 60 + planetRng() * 120;
      planetPalette = solRef.colors.map(c => hueRotate(c, hueShift));
      const flavorTemplate = FAMILIARITY_FLAVORS[Math.floor(planetRng() * FAMILIARITY_FLAVORS.length)];
      flavor = flavorTemplate.replace('{planet}', solRef.name);
    } else {
      flavor = generateFlavorText(type, planetRng);
    }

    const letter = String.fromCharCode(98 + i); // b, c, d, ...

    const planet = {
      id: letter,
      name: `${system.name} ${letter}`,
      radius,
      orbitRadius,
      orbitSpeed,
      rotationSpeed,
      axialTilt,
      type,
      baseColor,
      bandColor,
      hasAtmosphere,
      atmosphereColor,
      hasRings,
      ringInner,
      ringOuter,
      ringColor,
      flavor,
      _meshSeed: system.seed * 1000 + i + 7777,
      _palette: planetPalette || palette.base
    };

    planets.push(planet);
  }

  return planets;
}

export { createPlanetMesh };
