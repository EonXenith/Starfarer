// Sol planets — hand-authored, real proportions stylized for gameplay
export const solPlanets = [
  {
    id: "mercury",
    name: "Mercury",
    radius: 0.35,
    orbitRadius: 8,
    orbitSpeed: 0.00120,
    rotationSpeed: 0.002,
    axialTilt: 0.03,
    color: 0x8c7e6d,
    hasAtmosphere: false,
    atmosphereColor: null,
    textureUrl: "textures/mercury.jpg",
    flavor: "A scorched world of craters and silence, baking in the Sun's glare."
  },
  {
    id: "venus",
    name: "Venus",
    radius: 0.7,
    orbitRadius: 11,
    orbitSpeed: 0.00088,
    rotationSpeed: 0.001,
    axialTilt: 0.05,
    color: 0xddb87a,
    hasAtmosphere: true,
    atmosphereColor: 0xffddaa,
    textureUrl: "textures/venus.jpg",
    flavor: "Shrouded in acid clouds, a greenhouse gone mad. Beautiful from orbit."
  },
  {
    id: "earth",
    name: "Earth",
    radius: 0.75,
    orbitRadius: 14,
    orbitSpeed: 0.00075,
    rotationSpeed: 0.003,
    axialTilt: 0.41,
    color: 0x4488cc,
    hasAtmosphere: true,
    atmosphereColor: 0x6699ff,
    textureUrl: "textures/earth.jpg",
    flavor: "Home. Blue oceans, green continents, white clouds. The standard by which all worlds are measured."
  },
  {
    id: "mars",
    name: "Mars",
    radius: 0.5,
    orbitRadius: 17,
    orbitSpeed: 0.00060,
    rotationSpeed: 0.003,
    axialTilt: 0.44,
    color: 0xcc6644,
    hasAtmosphere: true,
    atmosphereColor: 0xdd8866,
    textureUrl: "textures/mars.jpg",
    flavor: "The red planet. Dust storms, ancient riverbeds, and the tallest volcano in the system."
  },
  {
    id: "jupiter",
    name: "Jupiter",
    radius: 2.2,
    orbitRadius: 22,
    orbitSpeed: 0.00033,
    rotationSpeed: 0.005,
    axialTilt: 0.05,
    color: 0xddaa77,
    hasAtmosphere: true,
    atmosphereColor: 0xddcc99,
    textureUrl: "textures/jupiter.jpg",
    emissiveIntensity: 0.05,
    flavor: "King of planets. Its Great Red Spot has raged for centuries."
  },
  {
    id: "saturn",
    name: "Saturn",
    radius: 1.8,
    orbitRadius: 27,
    orbitSpeed: 0.00024,
    rotationSpeed: 0.004,
    axialTilt: 0.47,
    color: 0xeedd88,
    hasAtmosphere: true,
    atmosphereColor: 0xeeddaa,
    hasRings: true,
    ringInner: 2.2,
    ringOuter: 3.8,
    ringColor: 0xccbb88,
    textureUrl: "textures/saturn.jpg",
    ringTextureUrl: "textures/saturn_ring.png",
    emissiveIntensity: 0.05,
    flavor: "The jewel of the solar system, girded by its impossible rings."
  },
  {
    id: "uranus",
    name: "Uranus",
    radius: 1.2,
    orbitRadius: 31,
    orbitSpeed: 0.00017,
    rotationSpeed: 0.003,
    axialTilt: 1.71,
    color: 0x88ccdd,
    hasAtmosphere: true,
    atmosphereColor: 0xaaddee,
    textureUrl: "textures/uranus.jpg",
    emissiveIntensity: 0.08,
    flavor: "Tipped on its side, rolling through the void in pale blue silence."
  },
  {
    id: "neptune",
    name: "Neptune",
    radius: 1.1,
    orbitRadius: 35,
    orbitSpeed: 0.00013,
    rotationSpeed: 0.003,
    axialTilt: 0.49,
    color: 0x4466dd,
    hasAtmosphere: true,
    atmosphereColor: 0x5577ee,
    textureUrl: "textures/neptune.jpg",
    emissiveIntensity: 0.10,
    flavor: "The windiest world. Supersonic gales howl across its cobalt face."
  }
];

// Star systems — 12 hand-authored for v1
// Positions on the galactic XZ plane. Chain follows spiral arm 0,
// bridges through the inter-arm region, then follows arm 1.
export const starSystems = [
  {
    id: "sol",
    name: "Sol",
    position: { x: 43, y: 0, z: -84 },
    starType: "G",
    starColor: 0xffeecc,
    isHandAuthored: true,
    seed: null,
    flavor: "Home. The yellow dwarf and its eight worlds.",
    visited: true,
    scanned: true
  },
  {
    id: "proxima",
    name: "Proxima",
    position: { x: 47, y: 0.5, z: -82 },
    starType: "M",
    starColor: 0xff6644,
    isHandAuthored: false,
    seed: 42,
    flavor: "The nearest star. A dim red dwarf with a handful of battered worlds.",
    visited: false,
    scanned: false
  },
  {
    id: "aelra",
    name: "Aelra Prime",
    position: { x: 29, y: -0.3, z: -86 },
    starType: "F",
    starColor: 0xfff8dd,
    isHandAuthored: false,
    seed: 137,
    flavor: "A hot white star ringed by volatile worlds. The gateway to the deep galaxy.",
    visited: false,
    scanned: false
  },
  {
    id: "korin",
    name: "Korin's Reach",
    position: { x: 61, y: 0.8, z: -77 },
    starType: "K",
    starColor: 0xffaa55,
    isHandAuthored: false,
    seed: 256,
    flavor: "A solitary orange star at the end of a long spur. Quiet and remote.",
    visited: false,
    scanned: false
  },
  {
    id: "vethys",
    name: "Vethys",
    position: { x: 74, y: -0.5, z: -69 },
    starType: "G",
    starColor: 0xffeeaa,
    isHandAuthored: false,
    seed: 512,
    flavor: "A Sun-like star with a rich retinue of worlds. A crossroads of the mid-galaxy.",
    visited: false,
    scanned: false
  },
  {
    id: "ozmir",
    name: "Ozmir",
    position: { x: 74, y: 0.2, z: -55 },
    starType: "M",
    starColor: 0xff5533,
    isHandAuthored: false,
    seed: 1001,
    flavor: "A sullen red dwarf. Its worlds huddle close for warmth.",
    visited: false,
    scanned: false
  },
  {
    id: "tymos",
    name: "Tymos Binary",
    position: { x: 73, y: 1.2, z: -41 },
    starType: "B",
    starColor: 0xaaccff,
    isHandAuthored: false,
    seed: 777,
    flavor: "A blazing blue giant with a faint companion. Its worlds are bathed in ultraviolet.",
    visited: false,
    scanned: false
  },
  {
    id: "pellan",
    name: "Pellan",
    position: { x: 72, y: -0.7, z: -29 },
    starType: "G",
    starColor: 0xffee99,
    isHandAuthored: false,
    seed: 1337,
    flavor: "A steady yellow star far from home. Its worlds feel strangely familiar.",
    visited: false,
    scanned: false
  },
  {
    id: "hresh",
    name: "Hresh",
    position: { x: 80, y: 0.9, z: -15 },
    starType: "K",
    starColor: 0xffbb66,
    isHandAuthored: false,
    seed: 1600,
    flavor: "An ancient orange star. Its planets bear the scars of eons.",
    visited: false,
    scanned: false
  },
  {
    id: "daris",
    name: "Daris-9",
    position: { x: 85, y: 0.4, z: 0 },
    starType: "F",
    starColor: 0xfff5cc,
    isHandAuthored: false,
    seed: 2048,
    flavor: "A bright white star on the outer arm. Surveyor designation: Daris-9.",
    visited: false,
    scanned: false
  },
  {
    id: "yltheran",
    name: "Yltheran",
    position: { x: 87, y: -1.0, z: 17 },
    starType: "M",
    starColor: 0xff4422,
    isHandAuthored: false,
    seed: 2500,
    flavor: "The farthest red dwarf. Cold, dim, and full of secrets.",
    visited: false,
    scanned: false
  },
  {
    id: "mervael",
    name: "Mer Vael",
    position: { x: 86, y: 1.5, z: 34 },
    starType: "A",
    starColor: 0xddddff,
    isHandAuthored: false,
    seed: 3000,
    flavor: "A brilliant white star at the galaxy's edge. The farthest destination known.",
    visited: false,
    scanned: false
  }
];

// Galaxy generation
export const GALAXY_SEED = 0xC0FFEE;
export const PROCEDURAL_SYSTEM_COUNT = 150;

// Spiral galaxy configuration (shared between backdrop painting and system generator)
export const GALAXY = {
  arms: 4,
  armPitch: 0.22,
  armScale: 30,          // inner radius in ly (canvas: armScale * 1024/250)
  armBases: [0, Math.PI/2, Math.PI, 3*Math.PI/2],
  armTurns: 1.5,         // total turns per arm
  discRadius: 250,
  discThickness: 2,
  haloThickness: 5
};

// Fog-of-war: systems within this radius of Sol have names pre-revealed
export const STARTING_KNOWLEDGE_RADIUS = 30;

// Ship definitions
export const ships = [
  {
    id: "scout",
    name: "Falcon Scout",
    tagline: "Long-range, nimble, fragile-looking. Sees farther.",
    jumpRange: 35,
    sublightSpeed: 1.6,
    scanRange: 25,
    turnResponsiveness: 1.4
  },
  {
    id: "cruiser",
    name: "Comet Cruiser",
    tagline: "Balanced and dependable. The explorer's workhorse.",
    jumpRange: 25,
    sublightSpeed: 1.0,
    scanRange: 18,
    turnResponsiveness: 1.0
  },
  {
    id: "wayfarer",
    name: "Mule Wayfarer",
    tagline: "Built for the long haul. Slow but unstoppable.",
    jumpRange: 18,
    sublightSpeed: 0.7,
    scanRange: 12,
    turnResponsiveness: 0.7
  }
];
