import * as THREE from 'three';
import { buildSpaceStation } from '../ships/builders.js';

let scene = null;
let camera = null;
let station = null;
let streaks = null;
let streakSpeed = 3.5;
let animating = false;
let rafId = null;
let renderer = null;
let onBeginCallback = null;
let transitionActive = false;
let transitionStart = 0;

const STREAK_COUNT = 3000;
const STREAK_RADIUS = 80;
const STREAK_DEPTH = 600;
const STREAK_LENGTH = 25;
const FAR_Z = -500;

export function enter(mainRenderer, onBegin) {
  renderer = mainRenderer;
  onBeginCallback = onBegin;
  streakSpeed = 3.5;
  transitionActive = false;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 0, 0);
  camera.lookAt(0, 0, -1);

  // Lighting
  const keyLight = new THREE.DirectionalLight(0xffeecc, 1.5);
  keyLight.position.set(10, 5, 10);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x88aaff, 0.6);
  fillLight.position.set(-8, -2, 5);
  scene.add(fillLight);

  scene.add(new THREE.AmbientLight(0x222233, 0.3));

  // Hyperspace streaks
  const positions = new Float32Array(STREAK_COUNT * 6);
  for (let i = 0; i < STREAK_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * STREAK_RADIUS;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const z = -Math.random() * STREAK_DEPTH;
    const idx = i * 6;
    positions[idx]     = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;
    positions[idx + 3] = x;
    positions[idx + 4] = y;
    positions[idx + 5] = z + STREAK_LENGTH;
  }
  const streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const streakMat = new THREE.LineBasicMaterial({
    color: 0xaaccff,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  });
  streaks = new THREE.LineSegments(streakGeo, streakMat);
  scene.add(streaks);

  // Space station
  station = buildSpaceStation();
  station.scale.setScalar(0.9);
  station.position.set(8, -1, -25);
  scene.add(station);

  // Show welcome overlay
  const welcomeEl = document.getElementById('welcome');
  welcomeEl.classList.remove('hidden');
  welcomeEl.style.display = '';
  welcomeEl.style.background = '';

  // Reset content style for re-entry
  const content = document.querySelector('.welcome-content');
  if (content) {
    content.style.opacity = '';
    content.style.transform = '';
    content.style.transition = '';
  }
  const btn = document.getElementById('welcome-begin');
  if (btn) {
    btn.style.pointerEvents = '';
    btn.style.opacity = '';
  }

  // Click handler
  document.getElementById('welcome-begin').addEventListener('click', onBeginClick);
  document.addEventListener('keydown', skipHandler);
  window.addEventListener('resize', onResize);

  animating = true;
  animate();
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onBeginClick() {
  if (transitionActive) return;
  startDiveTransition();
}

function skipHandler(e) {
  if (!transitionActive) return;
  if (e.code === 'Space' || e.code === 'Escape') {
    e.preventDefault();
    finishTransition();
  }
}

// ───── Animation loop ─────

function animate() {
  if (!animating) return;
  rafId = requestAnimationFrame(animate);

  const time = performance.now();

  // Advance streaks
  const posAttr = streaks.geometry.attributes.position;
  const arr = posAttr.array;
  const dz = streakSpeed * 0.15;

  for (let i = 0; i < STREAK_COUNT; i++) {
    const idx = i * 6;
    arr[idx + 2] += dz;
    arr[idx + 5] += dz;

    // Recycle past camera — reset BOTH endpoints
    if (arr[idx + 2] > 5) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * STREAK_RADIUS;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = FAR_Z;
      arr[idx]     = x;
      arr[idx + 1] = y;
      arr[idx + 2] = z;
      arr[idx + 3] = x;
      arr[idx + 4] = y;
      arr[idx + 5] = z + STREAK_LENGTH;
    }
  }
  posAttr.needsUpdate = true;

  // Station ring rotation
  if (station && station.userData.ringGroup) {
    station.userData.ringGroup.rotation.z += 0.003;
  }

  // Station bob
  if (station && !transitionActive) {
    station.position.y = -1 + Math.sin(time * 0.0008) * 0.15;
  }

  // Blinker
  if (station && station.userData.blinker) {
    const cycle = time % 1600;
    station.userData.blinker.material.color.setHex(cycle < 800 ? 0xff4444 : 0x440000);
  }

  // Render
  renderer.setClearColor(0x000000, 1);
  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  renderer.setScissor(0, 0, window.innerWidth, window.innerHeight);
  renderer.setScissorTest(false);
  renderer.render(scene, camera);
}

// ───── Dive transition (Piece 2) ─────

function startDiveTransition() {
  transitionActive = true;
  transitionStart = performance.now();

  // Disable button
  const btn = document.getElementById('welcome-begin');
  btn.style.pointerEvents = 'none';
  btn.style.opacity = '0';

  // Fade out text
  const content = document.querySelector('.welcome-content');
  content.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
  content.style.opacity = '0';
  content.style.transform = 'translateX(-15%) scale(0.92)';

  runTransition();
}

function runTransition() {
  if (!transitionActive) return;
  const elapsed = performance.now() - transitionStart;
  const duration = 1500;
  const t = Math.min(elapsed / duration, 1);

  if (t >= 1) {
    finishTransition();
    return;
  }

  // Speed ramp: ease-in cubic
  const eased = t * t;
  streakSpeed = 3.5 + (24.0 - 3.5) * eased;

  // Camera dives forward
  camera.position.z = -eased * 30;

  // Station drifts past
  station.position.x = 8 + eased * 15;

  // Final 27%: fade to white
  if (t > 0.73) {
    const fadeT = (t - 0.73) / 0.27;
    document.getElementById('welcome').style.background =
      `rgba(220, 240, 255, ${fadeT * 0.85})`;
  }

  requestAnimationFrame(runTransition);
}

function finishTransition() {
  transitionActive = false;
  cleanup();

  // Hide welcome overlay
  const welcomeEl = document.getElementById('welcome');
  welcomeEl.style.display = 'none';
  welcomeEl.classList.add('hidden');
  welcomeEl.style.background = '';

  if (onBeginCallback) {
    const cb = onBeginCallback;
    onBeginCallback = null;
    cb();
  }
}

// ───── Lifecycle ─────

function cleanup() {
  animating = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  document.getElementById('welcome-begin').removeEventListener('click', onBeginClick);
  document.removeEventListener('keydown', skipHandler);
  window.removeEventListener('resize', onResize);

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
  station = null;
  streaks = null;
}

export function exit() {
  cleanup();
  const welcomeEl = document.getElementById('welcome');
  if (welcomeEl) {
    welcomeEl.style.display = 'none';
    welcomeEl.classList.add('hidden');
  }
}

export function getScene() { return scene; }
