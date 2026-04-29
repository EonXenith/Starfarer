import * as THREE from 'three';
import { buildScoutModel, buildCruiserModel, buildWayfarerModel } from '../ships/builders.js';

const builders = { scout: buildScoutModel, cruiser: buildCruiserModel, wayfarer: buildWayfarerModel };

let scene, camera;
let cutsceneActive = false;
let cutsceneStart = 0;
let cutsceneDuration = 0;
let onCompleteCallback = null;
let streaks = null;
let streakPositions = null;
let shipModel = null;
let starfieldMesh = null;
let cutsceneType = null;

const HYPERSPACE_STARS = 2000;
const HYPERSPACE_RADIUS = 50;
const HYPERSPACE_LENGTH = 400;
const STREAK_LENGTH = 20;

export function startHyperspace(renderer, mainCamera, targetDisplayName, gameState, onComplete) {
  cutsceneType = 'hyperspace';
  cutsceneActive = true;
  cutsceneStart = performance.now();
  cutsceneDuration = 3000;
  onCompleteCallback = onComplete;
  camera = mainCamera;

  scene = new THREE.Scene();

  // Build streaking starlines as LineSegments
  const count = HYPERSPACE_STARS;
  const positions = new Float32Array(count * 6); // 2 verts per line, 3 components each

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * HYPERSPACE_RADIUS;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const z = -Math.random() * HYPERSPACE_LENGTH;

    const idx = i * 6;
    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;
    positions[idx + 3] = x;
    positions[idx + 4] = y;
    positions[idx + 5] = z + STREAK_LENGTH;
  }

  streakPositions = positions;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.LineBasicMaterial({
    color: 0xccddff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
  });

  streaks = new THREE.LineSegments(geo, mat);
  scene.add(streaks);

  // Camera at one end looking down the cylinder
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, -100);

  // Show cutscene overlay with text
  const cutsceneEl = document.getElementById('cutscene');
  const textEl = document.getElementById('cutscene-text');
  cutsceneEl.classList.remove('hidden');
  textEl.textContent = `Jumping to ${targetDisplayName}...`;
  textEl.style.animation = 'none';
  textEl.offsetHeight; // reflow
  textEl.style.animation = 'fadeInOut 3s ease-in-out';

  // Skip handlers
  document.addEventListener('keydown', skipHandler);

  return scene;
}

export function startSublight(renderer, mainCamera, planetName, gameState, onComplete) {
  cutsceneType = 'sublight';
  cutsceneActive = true;
  cutsceneStart = performance.now();
  cutsceneDuration = Math.max(1500, Math.min(2500, 2000 / gameState.ship.sublightSpeed));
  onCompleteCallback = onComplete;
  camera = mainCamera;

  scene = new THREE.Scene();

  // Subtle starfield with slight motion
  const starGeo = new THREE.BufferGeometry();
  const starPositions = new Float32Array(2000 * 3);
  for (let i = 0; i < 2000 * 3; i++) {
    starPositions[i] = (Math.random() - 0.5) * 300;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xaabbcc, size: 0.4, sizeAttenuation: true });
  starfieldMesh = new THREE.Points(starGeo, starMat);
  scene.add(starfieldMesh);

  // Short streaks for motion feel (much shorter and dimmer than hyperspace)
  const count = 400;
  const positions = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 80;
    const y = (Math.random() - 0.5) * 80;
    const z = -Math.random() * 200;
    const idx = i * 6;
    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;
    positions[idx + 3] = x;
    positions[idx + 4] = y;
    positions[idx + 5] = z + 3; // short streaks
  }
  streakPositions = positions;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0x8899aa,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending
  });
  streaks = new THREE.LineSegments(geo, mat);
  scene.add(streaks);

  // Ship model at bottom center
  const builder = builders[gameState.ship.id];
  if (builder) {
    shipModel = builder();
    shipModel.scale.setScalar(0.4);
    shipModel.position.set(0, -2, -5);
    shipModel.rotation.y = Math.PI;
    scene.add(shipModel);

    // Light the ship
    const shipLight = new THREE.DirectionalLight(0xffffff, 2);
    shipLight.position.set(1, 2, 3);
    scene.add(shipLight);
    scene.add(new THREE.AmbientLight(0x334466, 1));
  }

  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, -50);

  // Show cutscene overlay (minimal text)
  const cutsceneEl = document.getElementById('cutscene');
  const textEl = document.getElementById('cutscene-text');
  cutsceneEl.classList.remove('hidden');
  textEl.textContent = `Approaching ${planetName}...`;
  textEl.style.animation = 'none';
  textEl.offsetHeight;
  textEl.style.animation = `fadeInOut ${cutsceneDuration}ms ease-in-out`;

  document.addEventListener('keydown', skipHandler);

  return scene;
}

function skipHandler(e) {
  if (e.code === 'Space' || e.code === 'Escape') {
    e.preventDefault();
    completeCutscene();
  }
}

function completeCutscene() {
  cutsceneActive = false;
  document.removeEventListener('keydown', skipHandler);

  const cutsceneEl = document.getElementById('cutscene');
  cutsceneEl.classList.add('hidden');

  if (scene) {
    scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    scene = null;
  }
  streaks = null;
  streakPositions = null;
  shipModel = null;
  starfieldMesh = null;

  if (onCompleteCallback) {
    const cb = onCompleteCallback;
    onCompleteCallback = null;
    cb();
  }
}

export function update(dt) {
  if (!cutsceneActive || !scene) return null;

  const elapsed = performance.now() - cutsceneStart;
  if (elapsed >= cutsceneDuration) {
    completeCutscene();
    return null;
  }

  const t = elapsed / cutsceneDuration;

  if (cutsceneType === 'hyperspace') {
    // Move streaks toward camera
    const speed = 4.0;
    const posAttr = streaks.geometry.attributes.position;
    const arr = posAttr.array;

    for (let i = 0; i < HYPERSPACE_STARS; i++) {
      const idx = i * 6;
      arr[idx + 2] += speed * dt * 0.1;
      arr[idx + 5] += speed * dt * 0.1;

      // Recycle past camera
      if (arr[idx + 2] > 20) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * HYPERSPACE_RADIUS;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = -HYPERSPACE_LENGTH;
        arr[idx] = x;
        arr[idx + 1] = y;
        arr[idx + 2] = z;
        arr[idx + 3] = x;
        arr[idx + 4] = y;
        arr[idx + 5] = z + STREAK_LENGTH;
      }
    }
    posAttr.needsUpdate = true;

    // Camera shake
    camera.position.x = Math.sin(elapsed * 0.01) * 0.3;
    camera.position.y = Math.cos(elapsed * 0.013) * 0.2;

  } else if (cutsceneType === 'sublight') {
    // Move streaks gently
    const speed = 1.5;
    const posAttr = streaks.geometry.attributes.position;
    const arr = posAttr.array;

    for (let i = 0; i < 400; i++) {
      const idx = i * 6;
      arr[idx + 2] += speed * dt * 0.05;
      arr[idx + 5] += speed * dt * 0.05;

      if (arr[idx + 2] > 10) {
        const x = (Math.random() - 0.5) * 80;
        const y = (Math.random() - 0.5) * 80;
        const z = -200;
        arr[idx] = x;
        arr[idx + 1] = y;
        arr[idx + 2] = z;
        arr[idx + 3] = x;
        arr[idx + 4] = y;
        arr[idx + 5] = z + 3;
      }
    }
    posAttr.needsUpdate = true;

    // Rotate starfield subtly
    if (starfieldMesh) {
      starfieldMesh.rotation.y += 0.0006;
    }

    // Gentle ship bob
    if (shipModel) {
      shipModel.position.y = -2 + Math.sin(elapsed * 0.003) * 0.1;
    }
  }

  return scene;
}

export function isActive() { return cutsceneActive; }
export function getScene() { return scene; }
