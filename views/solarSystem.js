import * as THREE from 'three';
import { solPlanets } from '../data.js';
import { generateSystemPlanets, createPlanetMesh } from '../procgen.js';

let scene, camera, controls, sunLight, starfield;
let planetMeshes = [];
let orbitLines = [];
let sunMesh = null;
let selectionRing = null;
let currentSystem = null;
let currentPlanets = [];
let raycaster, mouse;
let onTravelCallback = null;
let onGalaxyCallback = null;
let frozen = false;

// Cache for generated planet data per system
const systemPlanetCache = {};

export function enter(renderer, orbitControls, mainCamera, gameState, callbacks) {
  scene = new THREE.Scene();
  camera = mainCamera;
  controls = orbitControls;
  onTravelCallback = callbacks.onTravel;
  onGalaxyCallback = callbacks.onGalaxy;
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  frozen = false;

  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 5;
  controls.maxDistance = 120;
  controls.rotateSpeed = gameState.ship.turnResponsiveness;

  // Starfield
  const starGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(5000 * 3);
  for (let i = 0; i < 5000 * 3; i++) {
    starPositions[i] = (Math.random() - 0.5) * 800;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true });
  starfield = new THREE.Points(starGeo, starMat);
  scene.add(starfield);

  // Get system info
  currentSystem = gameState.systems.find(s => s.id === gameState.currentSystemId);

  // Sun/Star
  const starColor = currentSystem.starColor;
  const sunGeo = new THREE.SphereGeometry(3, 32, 32);
  const sunMatl = new THREE.MeshBasicMaterial({ color: starColor });
  sunMesh = new THREE.Mesh(sunGeo, sunMatl);
  sunMesh.userData.isStar = true;
  sunMesh.userData.starData = {
    id: '__star__',
    name: currentSystem.name + ' Star',
    radius: 3,
    flavor: currentSystem.flavor || `The central star of the ${currentSystem.name} system.`,
    rotationSpeed: 0.001
  };
  scene.add(sunMesh);

  // Sun glow
  const glowGeo = new THREE.SphereGeometry(3.5, 32, 32);
  const glowMat = new THREE.MeshBasicMaterial({
    color: starColor,
    transparent: true,
    opacity: 0.15
  });
  scene.add(new THREE.Mesh(glowGeo, glowMat));

  // Sun light
  sunLight = new THREE.PointLight(starColor, 2500, 0, 2);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);

  // Ambient
  scene.add(new THREE.AmbientLight(0x222244, 0.2));

  // Load planets for current system
  if (currentSystem.isHandAuthored) {
    currentPlanets = solPlanets;
  } else {
    if (!systemPlanetCache[currentSystem.id]) {
      systemPlanetCache[currentSystem.id] = generateSystemPlanets(currentSystem);
    }
    currentPlanets = systemPlanetCache[currentSystem.id];
  }

  buildPlanets(gameState);

  // Camera position
  camera.position.set(0, 40, 50);
  controls.target.set(0, 0, 0);
  controls.update();

  // Event listeners
  renderer.domElement.addEventListener('click', onClick);
  document.getElementById('panel-close').addEventListener('click', hidePanel);

  return scene;
}

function buildPlanets(gameState) {
  planetMeshes = [];
  orbitLines = [];

  currentPlanets.forEach((planet) => {
    let group;
    if (planet.textureUrl) {
      // Sol planet — use solid color (fallback since no textures)
      group = createSolPlanetMesh(planet);
    } else {
      group = createPlanetMesh(planet);
    }

    group.userData.planet = planet;
    group.userData.orbitAngle = Math.random() * Math.PI * 2;
    group.userData.orbitRadius = planet.orbitRadius;
    group.userData.orbitSpeed = planet.orbitSpeed;
    group.userData.rotationSpeed = planet.rotationSpeed;

    // Position on orbit
    const angle = group.userData.orbitAngle;
    group.position.x = Math.cos(angle) * planet.orbitRadius;
    group.position.z = Math.sin(angle) * planet.orbitRadius;

    scene.add(group);
    planetMeshes.push(group);

    // Orbit trail
    const orbitPoints = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      orbitPoints.push(new THREE.Vector3(
        Math.cos(a) * planet.orbitRadius,
        0,
        Math.sin(a) * planet.orbitRadius
      ));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x6688aa, transparent: true, opacity: 0.7 });
    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    scene.add(orbitLine);
    orbitLines.push(orbitLine);
  });
}

function createSolPlanetMesh(planet) {
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(planet.radius, 32, 32);
  const matOpts = {
    color: planet.color,
    roughness: 0.7,
    metalness: 0.1
  };
  if (planet.emissiveIntensity) {
    matOpts.emissive = new THREE.Color(planet.color);
    matOpts.emissiveIntensity = planet.emissiveIntensity;
  }
  const mat = new THREE.MeshStandardMaterial(matOpts);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.z = planet.axialTilt || 0;
  group.add(mesh);

  if (planet.hasAtmosphere) {
    const atmosGeo = new THREE.SphereGeometry(planet.radius * 1.08, 32, 32);
    const atmosMat = new THREE.MeshStandardMaterial({
      color: planet.atmosphereColor,
      transparent: true,
      opacity: 0.15,
      roughness: 1,
      metalness: 0
    });
    const atmos = new THREE.Mesh(atmosGeo, atmosMat);
    group.add(atmos);
  }

  if (planet.hasRings) {
    const ringGeo = new THREE.RingGeometry(
      planet.radius * planet.ringInner,
      planet.radius * planet.ringOuter,
      64
    );
    const ringMat = new THREE.MeshStandardMaterial({
      color: planet.ringColor,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      roughness: 0.9,
      metalness: 0.1
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2 + (planet.axialTilt || 0) * 0.3;
    group.add(ring);
  }

  return group;
}

function onClick(event) {
  if (frozen) return;
  const canvas = event.target;
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Check star first
  const starHits = raycaster.intersectObject(sunMesh);
  if (starHits.length > 0) {
    selectStar();
    return;
  }

  const intersects = raycaster.intersectObjects(planetMeshes, true);

  if (intersects.length > 0) {
    let target = intersects[0].object;
    while (target.parent && !target.userData.planet) {
      target = target.parent;
    }
    if (target.userData.planet) {
      selectPlanet(target.userData.planet, target);
    }
  } else {
    deselectPlanet();
  }
}

function selectStar() {
  deselectPlanet();

  const ringGeo = new THREE.RingGeometry(3.5, 4.0, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffcc00,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide
  });
  selectionRing = new THREE.Mesh(ringGeo, ringMat);
  selectionRing.userData.targetMesh = sunMesh;
  scene.add(selectionRing);

  showPanel(sunMesh.userData.starData, true);
}

function selectPlanet(planet, mesh) {
  deselectPlanet();

  const ringGeo = new THREE.RingGeometry(planet.radius * 1.3, planet.radius * 1.5, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00ccff,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide
  });
  selectionRing = new THREE.Mesh(ringGeo, ringMat);
  selectionRing.userData.targetMesh = mesh;
  scene.add(selectionRing);

  showPanel(planet, false);
}

function deselectPlanet() {
  if (selectionRing) {
    scene.remove(selectionRing);
    selectionRing.geometry.dispose();
    selectionRing.material.dispose();
    selectionRing = null;
  }
  hidePanel();
}

function showPanel(planet, isStar) {
  const panel = document.getElementById('panel');
  const title = document.getElementById('panel-title');
  const body = document.getElementById('panel-body');
  const actions = document.getElementById('panel-actions');

  title.textContent = planet.name;
  body.innerHTML = '';

  if (isStar) {
    const typeEl = document.createElement('p');
    typeEl.style.color = '#fa0';
    typeEl.style.fontSize = '0.75rem';
    typeEl.style.textTransform = 'uppercase';
    typeEl.style.marginBottom = '0.3rem';
    typeEl.textContent = 'Class ' + (currentSystem.starType || 'G') + ' star';
    body.appendChild(typeEl);
  } else if (planet.type) {
    const typeEl = document.createElement('p');
    typeEl.style.color = '#6a8';
    typeEl.style.fontSize = '0.75rem';
    typeEl.style.textTransform = 'uppercase';
    typeEl.style.marginBottom = '0.3rem';
    typeEl.textContent = planet.type + ' world';
    body.appendChild(typeEl);
  }

  const flavor = document.createElement('p');
  flavor.textContent = planet.flavor;
  body.appendChild(flavor);

  actions.innerHTML = '';
  const gameState = window.__gameState;
  if (isStar) {
    const btn = document.createElement('button');
    btn.textContent = 'Travel to Star';
    btn.addEventListener('click', () => {
      if (onTravelCallback) onTravelCallback(planet);
    });
    actions.appendChild(btn);
  } else if (gameState && gameState.currentPlanetId === planet.id) {
    const marker = document.createElement('span');
    marker.className = 'here-marker';
    marker.textContent = '✓ You are here';
    actions.appendChild(marker);
  } else {
    const btn = document.createElement('button');
    btn.textContent = 'Travel';
    btn.addEventListener('click', () => {
      if (onTravelCallback) onTravelCallback(planet);
    });
    actions.appendChild(btn);
  }

  panel.classList.remove('hidden');
}

function hidePanel() {
  document.getElementById('panel').classList.add('hidden');
}

export function exit(renderer) {
  renderer.domElement.removeEventListener('click', onClick);
  document.getElementById('panel-close').removeEventListener('click', hidePanel);
  deselectPlanet();
  if (scene) {
    scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
  }
  scene = null;
  planetMeshes = [];
  orbitLines = [];
}

export function update(dt, gameState) {
  if (!scene || frozen) return;

  // Update planet orbits and rotations
  // orbitSpeed values are radians per frame at 60fps; normalize by frame time
  const frameScale = dt / 16.667;
  planetMeshes.forEach((group) => {
    group.userData.orbitAngle += group.userData.orbitSpeed * frameScale;
    const a = group.userData.orbitAngle;
    group.position.x = Math.cos(a) * group.userData.orbitRadius;
    group.position.z = Math.sin(a) * group.userData.orbitRadius;

    // Rotate the planet itself
    if (group.children[0]) {
      group.children[0].rotation.y += group.userData.rotationSpeed * frameScale;
    }
  });

  // Update selection ring position (billboard to camera)
  if (selectionRing && selectionRing.userData.targetMesh) {
    const target = selectionRing.userData.targetMesh;
    selectionRing.position.copy(target.position);
    selectionRing.lookAt(camera.position);
  }

  controls.update();
  return scene;
}

export function getScene() { return scene; }

export function freeze() { frozen = true; }
export function unfreeze() { frozen = false; }

export function getPlanetMesh(planetId) {
  return planetMeshes.find(m => m.userData.planet && m.userData.planet.id === planetId);
}

export function getPlanetPosition(planetId) {
  const mesh = getPlanetMesh(planetId);
  return mesh ? mesh.position.clone() : new THREE.Vector3(14, 0, 0);
}
