import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { starSystems, solPlanets, ships, STARTING_KNOWLEDGE_RADIUS } from './data.js';
import { generateProceduralSystems } from './galaxyGen.js';
import * as ShipSelect from './views/shipSelect.js';
import * as SolarSystem from './views/solarSystem.js';
import * as PlanetArrival from './views/planetArrival.js';
import * as GalacticMap from './views/galacticMap.js';
import * as Cutscenes from './views/cutscenes.js';
import * as Welcome from './views/welcome.js';

// Renderer setup (§3.1)
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);

// OrbitControls (§3.4)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

// Game state (§5.5)
const GameState = {
  view: 'welcome',
  ship: null,
  currentSystemId: 'sol',
  currentPlanetId: 'earth',
  selectedSystemId: null,
  selectedPlanetId: null,
  visitedSystems: new Set(['sol']),
  scannedSystems: new Set(['sol']),
  visitedPlanets: new Set(['sol:earth']),
  systems: [...JSON.parse(JSON.stringify(starSystems)), ...generateProceduralSystems()],
  travelTween: null,
  cutscene: null,
  time: 0
};

// Expose for panel access
window.__gameState = GameState;

// Fog-of-war: centralized name resolution
function getDisplayName(system) {
  if (GameState.visitedSystems.has(system.id)) return system.name;
  if (GameState.scannedSystems.has(system.id)) return system.name;
  const sol = GameState.systems.find(s => s.id === 'sol');
  if (sol) {
    const dx = system.position.x - sol.position.x;
    const dz = system.position.z - sol.position.z;
    if (Math.sqrt(dx * dx + dz * dz) < STARTING_KNOWLEDGE_RADIUS) return system.name;
  }
  return "Unknown";
}

let activeScene = null;
let lastTime = performance.now();

// HUD elements
const hudEl = document.getElementById('hud');
const shipNameEl = document.getElementById('ship-name');
const locationEl = document.getElementById('location');
const galaxyBtn = document.getElementById('btn-galaxy');
const changeShipBtn = document.getElementById('btn-change-ship');

// Galaxy button — single handler, behavior changes with state
galaxyBtn.addEventListener('click', handleGalaxyBtn);
changeShipBtn.addEventListener('click', handleChangeShip);

function handleGalaxyBtn() {
  if (GameState.view === 'galactic_map') {
    // Back to solar system
    galaxyBtn.textContent = '🌌 Galaxy Map';
    GalacticMap.exit(renderer);
    enterSolarSystem();
  } else if (GameState.view === 'solar_system' || GameState.view === 'planet_arrival') {
    enterGalacticMap();
  }
}

function handleChangeShip() {
  if (GameState.view === 'solar_system' || GameState.view === 'planet_arrival') {
    // Clean up current view
    if (SolarSystem.getScene()) SolarSystem.exit(renderer);
    if (PlanetArrival.getScene()) PlanetArrival.exit();
    document.getElementById('panel').classList.add('hidden');

    GameState.view = 'ship_select';
    hudEl.classList.add('hidden');

    ShipSelect.enter(renderer, (ship) => {
      GameState.ship = ship;
      shipNameEl.textContent = ship.name;
      enterSolarSystem();
    });
  }
}

// View transitions
function enterWelcome() {
  GameState.view = 'welcome';
  hudEl.classList.add('hidden');
  Welcome.enter(renderer, () => {
    // Transition done — enter ship select with a brief fade-in from white
    enterShipSelect();
  });
}

function enterShipSelect() {
  GameState.view = 'ship_select';
  hudEl.classList.add('hidden');

  const shipSelectOverlay = document.getElementById('ship-select');
  shipSelectOverlay.classList.remove('hidden');
  shipSelectOverlay.style.opacity = '0';
  shipSelectOverlay.style.transition = 'opacity 0.5s ease-in';

  ShipSelect.enter(renderer, (ship) => {
    GameState.ship = ship;
    shipNameEl.textContent = ship.name;
    enterSolarSystem();
  });

  // Trigger fade-in on next frame
  requestAnimationFrame(() => {
    shipSelectOverlay.style.opacity = '1';
  });
}

function enterSolarSystem() {
  GameState.view = 'solar_system';
  hudEl.classList.remove('hidden');
  galaxyBtn.disabled = false;
  changeShipBtn.classList.remove('hidden');

  updateLocationDisplay();

  activeScene = SolarSystem.enter(renderer, controls, camera, GameState, {
    onTravel: (planet) => {
      startSublightTravel(planet);
    },
    onGalaxy: () => enterGalacticMap()
  });
}

function startSublightTravel(planet) {
  GameState.view = 'cutscene_sublight';
  hudEl.classList.add('hidden');
  galaxyBtn.disabled = true;
  changeShipBtn.classList.add('hidden');
  document.getElementById('panel').classList.add('hidden');
  SolarSystem.freeze();

  activeScene = Cutscenes.startSublight(renderer, camera, planet.name, GameState, () => {
    enterPlanetArrival(planet);
  });
}

function enterPlanetArrival(planet) {
  GameState.view = 'planet_arrival';
  hudEl.classList.remove('hidden');
  galaxyBtn.disabled = false;
  changeShipBtn.classList.remove('hidden');
  SolarSystem.exit(renderer);

  GameState.currentPlanetId = planet.id;
  updateLocationDisplay();

  activeScene = PlanetArrival.enter(renderer, controls, camera, planet, GameState, {
    onBack: () => {
      PlanetArrival.exit();
      enterSolarSystem();
    }
  });
}

function enterGalacticMap() {
  GameState.view = 'galactic_map';
  galaxyBtn.disabled = true;
  changeShipBtn.classList.add('hidden');
  document.getElementById('panel').classList.add('hidden');

  // Clean previous
  if (SolarSystem.getScene()) SolarSystem.exit(renderer);
  if (PlanetArrival.getScene()) PlanetArrival.exit();

  activeScene = GalacticMap.enter(renderer, controls, camera, GameState, {
    onJump: (system) => {
      startHyperspaceJump(system);
    },
    onScan: (system) => {
      showToast(`Scanned: ${system.name} (Class ${system.starType})`);
    },
    onClose: () => enterSolarSystem()
  });

  // Change galaxy button to "Back" while in map
  galaxyBtn.textContent = '← Back';
  galaxyBtn.disabled = false;
}

function startHyperspaceJump(system) {
  GameState.view = 'cutscene_hyperspace';
  hudEl.classList.add('hidden');
  galaxyBtn.disabled = true;
  changeShipBtn.classList.add('hidden');
  galaxyBtn.textContent = '🌌 Galaxy Map';
  document.getElementById('panel').classList.add('hidden');
  GalacticMap.exit(renderer);

  // Use display name at moment of jump (before visit reveals it)
  const jumpDisplayName = getDisplayName(system);

  activeScene = Cutscenes.startHyperspace(renderer, camera, jumpDisplayName, GameState, () => {
    // Arrive at new system
    GameState.currentSystemId = system.id;
    GameState.currentPlanetId = null;
    GameState.visitedSystems.add(system.id);
    GameState.scannedSystems.add(system.id);

    enterSolarSystem();
    showToast(`Arrived at ${system.name}`);
  });
}

function updateLocationDisplay() {
  const system = GameState.systems.find(s => s.id === GameState.currentSystemId);
  const sysName = system ? system.name : GameState.currentSystemId;

  if (GameState.currentPlanetId) {
    let planetName = GameState.currentPlanetId;
    if (system && system.isHandAuthored) {
      const p = solPlanets.find(pl => pl.id === GameState.currentPlanetId);
      if (p) planetName = p.name;
    } else {
      planetName = `${sysName} ${GameState.currentPlanetId}`;
    }
    locationEl.textContent = `${sysName} — ${planetName}`;
  } else {
    locationEl.textContent = `${sysName} System`;
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Main game loop
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = now - lastTime;
  lastTime = now;
  GameState.time += dt;

  let sceneToRender = null;

  switch (GameState.view) {
    case 'welcome':
      // Welcome view handles its own rendering
      return;

    case 'ship_select':
      // Ship select handles its own rendering via viewports
      return;

    case 'solar_system':
      sceneToRender = SolarSystem.update(dt, GameState);
      break;

    case 'planet_arrival':
      sceneToRender = PlanetArrival.update(dt);
      break;

    case 'galactic_map':
      sceneToRender = GalacticMap.update(dt);
      break;

    case 'cutscene_hyperspace':
    case 'cutscene_sublight':
      sceneToRender = Cutscenes.update(dt);
      break;
  }

  if (sceneToRender) {
    renderer.setClearColor(0x000000, 1);
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.setScissor(0, 0, window.innerWidth, window.innerHeight);
    renderer.setScissorTest(false);
    renderer.render(sceneToRender, camera);
  }
}

// Start
enterWelcome();
animate();
