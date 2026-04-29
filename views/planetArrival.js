import * as THREE from 'three';
import { solPlanets } from '../data.js';
import { createPlanetMesh } from '../procgen.js';

let scene, camera, controls, planet, planetMesh, currentSystem;
let onBackCallback = null;

export function enter(renderer, orbitControls, mainCamera, planetData, gameState, callbacks) {
  scene = new THREE.Scene();
  camera = mainCamera;
  controls = orbitControls;
  planet = planetData;
  onBackCallback = callbacks.onBack;

  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = gameState.ship.turnResponsiveness;

  // Starfield
  const starGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(3000 * 3);
  for (let i = 0; i < 3000 * 3; i++) {
    starPositions[i] = (Math.random() - 0.5) * 400;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.4, sizeAttenuation: true });
  scene.add(new THREE.Points(starGeo, starMat));

  // Lighting
  currentSystem = gameState.systems.find(s => s.id === gameState.currentSystemId);
  const starColor = currentSystem ? currentSystem.starColor : 0xffeecc;

  const sunLight = new THREE.DirectionalLight(starColor, 2.5);
  sunLight.position.set(5, 3, 8);
  scene.add(sunLight);
  scene.add(new THREE.AmbientLight(0x222244, 0.3));

  // Create planet or star mesh
  const isStar = planet.id === '__star__';
  if (isStar) {
    planetMesh = createStarArrivalMesh(planet, currentSystem);
  } else if (planet.textureUrl) {
    planetMesh = createSolArrivalMesh(planet);
  } else {
    planetMesh = createPlanetMesh(planet);
  }
  planetMesh.position.set(0, 0, 0);
  scene.add(planetMesh);

  // Camera positioned at close-up offset
  const radius = isStar ? 5 : planet.radius;
  const dist = radius * 4 + 2;
  camera.position.set(dist * 0.7, dist * 0.3, dist * 0.8);
  controls.target.set(0, 0, 0);
  controls.minDistance = radius * 1.8;
  controls.maxDistance = radius * 12;
  controls.update();

  // Show panel
  showArrivalPanel(planet, gameState);

  // Mark visited
  gameState.visitedPlanets.add(gameState.currentSystemId + ':' + planet.id);
  gameState.currentPlanetId = planet.id;

  return scene;
}

function createStarArrivalMesh(planet, system) {
  const group = new THREE.Group();
  const color = system ? system.starColor : 0xffeecc;
  const geo = new THREE.SphereGeometry(5, 64, 64);
  const mat = new THREE.MeshBasicMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);

  // Glow shell
  const glowGeo = new THREE.SphereGeometry(5.8, 64, 64);
  const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15 });
  group.add(new THREE.Mesh(glowGeo, glowMat));

  group.userData.planet = planet;
  return group;
}

function createSolArrivalMesh(planet) {
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(planet.radius, 64, 64);
  const matOpts = {
    color: planet.color,
    roughness: 0.6,
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
    const atmosGeo = new THREE.SphereGeometry(planet.radius * 1.1, 64, 64);
    const atmosMat = new THREE.MeshStandardMaterial({
      color: planet.atmosphereColor,
      transparent: true,
      opacity: 0.12,
      roughness: 1,
      metalness: 0
    });
    group.add(new THREE.Mesh(atmosGeo, atmosMat));
  }

  if (planet.hasRings) {
    const ringGeo = new THREE.RingGeometry(
      planet.radius * planet.ringInner,
      planet.radius * planet.ringOuter,
      128
    );
    const ringMat = new THREE.MeshStandardMaterial({
      color: planet.ringColor,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      roughness: 0.9
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2 + (planet.axialTilt || 0) * 0.3;
    group.add(ring);
  }

  group.userData.planet = planet;
  return group;
}

function showArrivalPanel(planet, gameState) {
  const panel = document.getElementById('panel');
  const title = document.getElementById('panel-title');
  const body = document.getElementById('panel-body');
  const actions = document.getElementById('panel-actions');

  title.textContent = planet.name;
  body.innerHTML = '';

  if (planet.type) {
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
  const btn = document.createElement('button');
  btn.textContent = 'Back to system';
  btn.addEventListener('click', () => {
    if (onBackCallback) onBackCallback();
  });
  actions.appendChild(btn);

  panel.classList.remove('hidden');
}

export function exit() {
  document.getElementById('panel').classList.add('hidden');
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
  planetMesh = null;
}

export function update(dt) {
  if (!scene || !planetMesh) return;

  // Rotate planet on axis (no orbital motion in arrival view)
  if (planetMesh.children[0]) {
    planetMesh.children[0].rotation.y += (planet.rotationSpeed || 0.003) * dt * 0.05;
  }

  controls.update();
  return scene;
}

export function getScene() { return scene; }
