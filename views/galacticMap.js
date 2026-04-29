import * as THREE from 'three';
import { GALAXY, STARTING_KNOWLEDGE_RADIUS } from '../data.js';

let scene, camera, controls;
let systemGroups = [];
let jumpCircle = null;
let scanCircle = null;
let hyperlaneGroup = null;
let hyperlaneLines = [];   // { line, phase } for pulse animation
let onJumpCallback = null;
let onScanCallback = null;
let onCloseCallback = null;
let raycaster, mouse;
let selectedSystem = null;
let selectionRing = null;
let gameState = null;
let labelContainer = null;
let labelEls = [];         // { el, system } for projection updates

const STAR_TYPE_RADIUS = { O: 1.0, B: 0.95, A: 0.85, F: 0.75, G: 0.7, K: 0.6, M: 0.5 };

function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

let solPosition = { x: 43, z: -84 };

function distanceToSol(system) {
  const dx = system.position.x - solPosition.x;
  const dz = system.position.z - solPosition.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function getDisplayName(system) {
  if (gameState.visitedSystems.has(system.id)) return system.name;
  if (gameState.scannedSystems.has(system.id)) return system.name;
  if (distanceToSol(system) < STARTING_KNOWLEDGE_RADIUS) return system.name;
  return "Unknown";
}

function isRevealed(system) {
  return getDisplayName(system) !== "Unknown";
}

function distanceBetween(a, b) {
  const dx = a.position.x - b.position.x;
  const dz = a.position.z - b.position.z;
  return Math.sqrt(dx * dx + dz * dz);
}

// ───── Main entry ─────

export function enter(renderer, orbitControls, mainCamera, state, callbacks) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000004);
  camera = mainCamera;
  controls = orbitControls;
  gameState = state;
  onJumpCallback = callbacks.onJump;
  onScanCallback = callbacks.onScan;
  onCloseCallback = callbacks.onClose;
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  selectedSystem = null;
  selectionRing = null;
  systemGroups = [];
  hyperlaneLines = [];

  const sol = gameState.systems.find(s => s.id === 'sol');
  if (sol) solPosition = { x: sol.position.x, z: sol.position.z };

  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 20;
  controls.maxDistance = 800;
  controls.rotateSpeed = 1.0;

  // Background starfield: 8000 dim stars, sizeAttenuation off
  const bgStarGeo = new THREE.BufferGeometry();
  const bgPositions = new Float32Array(8000 * 3);
  for (let i = 0; i < 8000 * 3; i++) {
    bgPositions[i] = (Math.random() - 0.5) * 1600;
  }
  bgStarGeo.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
  const bgStarMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.2,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.6
  });
  scene.add(new THREE.Points(bgStarGeo, bgStarMat));

  // System markers
  createSystemMarkers();

  // Hyperlane lines from current system
  buildHyperlanes();

  // Range circles around current system
  createRangeCircles();

  // DOM labels
  createLabels();

  // Camera framing
  frameCamera();

  renderer.domElement.addEventListener('click', onMapClick);
  document.getElementById('panel-close').addEventListener('click', hideMapPanel);

  return scene;
}

function frameCamera() {
  // Compute bounding box of all systems for camera distance
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const sys of gameState.systems) {
    if (sys.position.x < minX) minX = sys.position.x;
    if (sys.position.x > maxX) maxX = sys.position.x;
    if (sys.position.z < minZ) minZ = sys.position.z;
    if (sys.position.z > maxZ) maxZ = sys.position.z;
  }
  const spanX = maxX - minX;
  const spanZ = maxZ - minZ;
  const span = Math.max(spanX, spanZ) * 1.2; // 1.2x padding
  const camDist = span * 0.8;

  camera.position.set(0, camDist * 0.85, camDist * 0.5);
  controls.target.set(0, 0, 0);
  controls.update();
}

function createSystemMarkers() {
  gameState.systems.forEach(system => {
    const revealed = isRevealed(system);
    const isVisited = gameState.visitedSystems.has(system.id);
    const isCurrent = system.id === gameState.currentSystemId;

    const group = new THREE.Group();
    group.position.set(system.position.x, system.position.y || 0, system.position.z);

    // Central star sphere
    const baseSize = STAR_TYPE_RADIUS[system.starType] || 0.7;
    const starSize = isVisited ? baseSize * 1.3 : baseSize;
    const starGeo = new THREE.SphereGeometry(starSize, 12, 12);

    const displayColor = revealed ? system.starColor : 0x808080;
    const starOpacity = isVisited ? 1.0 : (revealed ? 0.8 : 0.5);

    const starMat = new THREE.MeshBasicMaterial({
      color: displayColor,
      transparent: true,
      opacity: starOpacity
    });
    const starMesh = new THREE.Mesh(starGeo, starMat);
    starMesh.userData.system = system;
    starMesh.userData.isClickTarget = true;
    starMesh.userData.isStarMesh = true;
    group.add(starMesh);

    // Soft glow halo (larger sphere, additive blending, BackSide)
    const haloRadius = starSize * 2.0;
    const haloGeo = new THREE.SphereGeometry(haloRadius, 12, 12);
    const haloColor = revealed ? system.starColor : 0x808080;
    const haloOpacity = revealed ? 0.25 : 0.12;
    const haloMat = new THREE.MeshBasicMaterial({
      color: haloColor,
      transparent: true,
      opacity: haloOpacity,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.userData.isHalo = true;
    group.add(haloMesh);

    // Concentric rings (2-4 per system, flat on XZ plane)
    const rng = mulberry32(system.seed || (system.id.charCodeAt(0) * 7919));
    const ringCount = 2 + Math.floor(rng() * 3);
    const innerR = starSize * 1.6;
    const outerR = starSize * 4.0;
    const ringColor = revealed ? system.starColor : 0x707070;
    const ringOpacity = revealed ? 0.55 : 0.4;

    for (let ri = 0; ri < ringCount; ri++) {
      const t = ringCount === 1 ? 0.5 : ri / (ringCount - 1);
      const ringRadius = innerR + t * (outerR - innerR);
      const ringGeo = new THREE.RingGeometry(ringRadius - 0.02, ringRadius + 0.02, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: ringOpacity,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.userData.isRing = true;
      group.add(ringMesh);
    }

    // Current system marker (green ring)
    if (isCurrent) {
      const markerGeo = new THREE.RingGeometry(starSize * 2.5, starSize * 2.8, 32);
      const markerMat = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.rotation.x = -Math.PI / 2;
      group.add(marker);
    }

    scene.add(group);
    systemGroups.push(group);
  });
}

// ───── Hyperlane lines (Issue 2) ─────

function buildHyperlanes() {
  // Clean up previous
  if (hyperlaneGroup) {
    hyperlaneGroup.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    scene.remove(hyperlaneGroup);
  }
  hyperlaneGroup = new THREE.Group();
  hyperlaneLines = [];

  const currentSys = gameState.systems.find(s => s.id === gameState.currentSystemId);
  if (!currentSys) { scene.add(hyperlaneGroup); return; }

  const ship = gameState.ship;
  const cx = currentSys.position.x;
  const cy = currentSys.position.y || 0;
  const cz = currentSys.position.z;

  let phaseIdx = 0;
  for (const other of gameState.systems) {
    if (other.id === currentSys.id) continue;
    const dist = distanceBetween(currentSys, other);
    if (dist > ship.jumpRange) continue;

    const points = [
      new THREE.Vector3(cx, cy, cz),
      new THREE.Vector3(other.position.x, other.position.y || 0, other.position.z)
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0x66ccff,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    });
    const line = new THREE.Line(geo, mat);
    line.renderOrder = -1; // render under markers
    hyperlaneGroup.add(line);
    hyperlaneLines.push({ line, phase: phaseIdx * 0.7 });
    phaseIdx++;
  }

  scene.add(hyperlaneGroup);
}

// ───── Range circles ─────

function createRangeCircles() {
  const currentSys = gameState.systems.find(s => s.id === gameState.currentSystemId);
  const ship = gameState.ship;
  const cx = currentSys.position.x;
  const cz = currentSys.position.z;
  const cy = currentSys.position.y || 0;

  const jumpPoints = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    jumpPoints.push(new THREE.Vector3(
      cx + Math.cos(a) * ship.jumpRange, cy,
      cz + Math.sin(a) * ship.jumpRange
    ));
  }
  const jumpGeo = new THREE.BufferGeometry().setFromPoints(jumpPoints);
  const jumpMat = new THREE.LineBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.5 });
  jumpCircle = new THREE.Line(jumpGeo, jumpMat);
  scene.add(jumpCircle);

  const scanPoints = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    scanPoints.push(new THREE.Vector3(
      cx + Math.cos(a) * ship.scanRange, cy,
      cz + Math.sin(a) * ship.scanRange
    ));
  }
  const scanGeo = new THREE.BufferGeometry().setFromPoints(scanPoints);
  const scanMat = new THREE.LineDashedMaterial({
    color: 0x44cc88, transparent: true, opacity: 0.4, dashSize: 2, gapSize: 1
  });
  scanCircle = new THREE.Line(scanGeo, scanMat);
  scanCircle.computeLineDistances();
  scene.add(scanCircle);
}

// ───── DOM-overlay labels (Issue 3) ─────

function createLabels() {
  // Remove any existing label container
  removeLabels();

  labelContainer = document.createElement('div');
  labelContainer.id = 'map-labels';
  document.body.appendChild(labelContainer);
  labelEls = [];

  for (const system of gameState.systems) {
    const revealed = isRevealed(system);
    const isCurrent = system.id === gameState.currentSystemId;

    const el = document.createElement('span');
    el.className = 'system-label';
    if (isCurrent) {
      el.classList.add('current');
    } else if (!revealed) {
      el.classList.add('unknown');
    }

    el.textContent = revealed ? system.name : 'Unknown';
    el.dataset.systemId = system.id;
    labelContainer.appendChild(el);
    labelEls.push({ el, system });
  }
}

function removeLabels() {
  if (labelContainer) {
    labelContainer.remove();
    labelContainer = null;
  }
  labelEls = [];
}

function updateLabelPositions() {
  if (!labelContainer || !camera) return;

  const w = window.innerWidth;
  const h = window.innerHeight;
  const camDist = camera.position.length();

  // Only show labels for systems within this world-space radius of controls.target
  const labelRadius = camDist * 0.5;
  const targetPos = controls.target;

  const tempVec = new THREE.Vector3();

  for (const { el, system } of labelEls) {
    tempVec.set(system.position.x, (system.position.y || 0) + 2.5, system.position.z);

    // Check distance from camera target for LOD culling
    const distFromTarget = tempVec.distanceTo(targetPos);
    if (distFromTarget > labelRadius) {
      el.style.display = 'none';
      continue;
    }

    // Project to screen
    tempVec.project(camera);

    // Behind camera or off-screen
    if (tempVec.z > 1 || tempVec.x < -1.1 || tempVec.x > 1.1 || tempVec.y < -1.1 || tempVec.y > 1.1) {
      el.style.display = 'none';
      continue;
    }

    const sx = (tempVec.x * 0.5 + 0.5) * w;
    const sy = (-tempVec.y * 0.5 + 0.5) * h;
    el.style.display = '';
    el.style.left = sx + 'px';
    el.style.top = sy + 'px';
  }
}

// Update a single label after scan/reveal
function refreshLabel(system) {
  const entry = labelEls.find(e => e.system.id === system.id);
  if (!entry) return;
  const revealed = isRevealed(system);
  const isCurrent = system.id === gameState.currentSystemId;
  entry.el.className = 'system-label';
  if (isCurrent) entry.el.classList.add('current');
  else if (!revealed) entry.el.classList.add('unknown');
  entry.el.textContent = revealed ? system.name : 'Unknown';
}

// ───── Click / panel logic ─────

function onMapClick(event) {
  const canvas = event.target;
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const clickTargets = [];
  systemGroups.forEach(g => {
    g.traverse(child => {
      if (child.userData.isClickTarget) clickTargets.push(child);
    });
  });

  const intersects = raycaster.intersectObjects(clickTargets);
  if (intersects.length > 0) {
    selectSystem(intersects[0].object.userData.system);
  } else {
    deselectSystem();
  }
}

function selectSystem(system) {
  // Remove previous selection ring
  if (selectionRing) {
    scene.remove(selectionRing);
    selectionRing.geometry.dispose();
    selectionRing.material.dispose();
    selectionRing = null;
  }

  selectedSystem = system;
  gameState.selectedSystemId = system.id;

  // Add selection ring
  const baseSize = STAR_TYPE_RADIUS[system.starType] || 0.7;
  const ringGeo = new THREE.RingGeometry(baseSize * 3.2, baseSize * 3.5, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffdd44,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  selectionRing = new THREE.Mesh(ringGeo, ringMat);
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.set(system.position.x, (system.position.y || 0) + 0.1, system.position.z);
  scene.add(selectionRing);

  showMapPanel(system);
}

function deselectSystem() {
  if (selectionRing) {
    scene.remove(selectionRing);
    selectionRing.geometry.dispose();
    selectionRing.material.dispose();
    selectionRing = null;
  }
  selectedSystem = null;
  gameState.selectedSystemId = null;
  hideMapPanel();
}

function showMapPanel(system) {
  const panel = document.getElementById('panel');
  const title = document.getElementById('panel-title');
  const body = document.getElementById('panel-body');
  const actions = document.getElementById('panel-actions');

  const currentSys = gameState.systems.find(s => s.id === gameState.currentSystemId);
  const dist = distanceBetween(system, currentSys);
  const ship = gameState.ship;
  const isInRange = dist <= ship.jumpRange;
  const isVisited = gameState.visitedSystems.has(system.id);
  const revealed = isRevealed(system);
  const isCurrent = system.id === gameState.currentSystemId;

  title.textContent = revealed ? system.name : 'Unknown';
  body.innerHTML = '';

  if (isCurrent) {
    const info = document.createElement('p');
    info.textContent = 'You are here.';
    info.style.color = '#6a8';
    body.appendChild(info);
    if (system.flavor) {
      const flav = document.createElement('p');
      flav.textContent = system.flavor;
      flav.style.marginTop = '0.4rem';
      body.appendChild(flav);
    }
  } else if (revealed) {
    const typeEl = document.createElement('p');
    typeEl.style.color = '#8ab';
    typeEl.style.fontSize = '0.75rem';
    typeEl.textContent = `Class ${system.starType} star \u00b7 ${dist.toFixed(1)} ly`;
    body.appendChild(typeEl);

    if (system.flavor) {
      const flav = document.createElement('p');
      flav.textContent = system.flavor;
      flav.style.marginTop = '0.3rem';
      body.appendChild(flav);
    }
    if (isVisited) {
      const visited = document.createElement('p');
      visited.style.color = '#6a8';
      visited.style.fontSize = '0.75rem';
      visited.style.marginTop = '0.3rem';
      visited.textContent = '\u2713 Visited';
      body.appendChild(visited);
    }
  } else {
    const distEl = document.createElement('p');
    distEl.style.color = '#667';
    distEl.textContent = `${dist.toFixed(1)} ly away`;
    body.appendChild(distEl);

    const rangeEl = document.createElement('p');
    rangeEl.style.fontSize = '0.75rem';
    rangeEl.style.marginTop = '0.2rem';
    if (isInRange) {
      rangeEl.style.color = '#8ab';
      rangeEl.textContent = 'Within jump range';
    } else {
      rangeEl.style.color = '#665';
      rangeEl.textContent = 'Beyond jump range';
    }
    body.appendChild(rangeEl);
  }

  actions.innerHTML = '';

  if (!isCurrent) {
    if (isInRange) {
      if (!revealed) {
        const scanBtn = document.createElement('button');
        scanBtn.textContent = 'Scan';
        scanBtn.addEventListener('click', () => {
          gameState.scannedSystems.add(system.id);
          updateSystemMaterials(system);
          refreshLabel(system);
          showMapPanel(system);
          if (onScanCallback) onScanCallback(system);
        });
        actions.appendChild(scanBtn);
      }

      const jumpBtn = document.createElement('button');
      jumpBtn.textContent = 'Jump';
      jumpBtn.addEventListener('click', () => {
        if (onJumpCallback) onJumpCallback(system);
      });
      actions.appendChild(jumpBtn);
    } else {
      const info = document.createElement('p');
      info.style.color = '#665';
      info.style.fontSize = '0.8rem';
      info.style.fontStyle = 'italic';
      info.textContent = `Beyond your jump range (${dist.toFixed(1)} ly). Travel to a closer system first.`;
      actions.appendChild(info);
    }
  }

  panel.classList.remove('hidden');
}

// Update materials from gray to true color on reveal
function updateSystemMaterials(system) {
  for (const group of systemGroups) {
    let match = false;
    group.traverse(child => {
      if (child.userData.system && child.userData.system.id === system.id) {
        match = true;
      }
    });
    if (!match) continue;

    group.traverse(child => {
      if (child.userData.isStarMesh) {
        child.material.color.setHex(system.starColor);
        child.material.opacity = 0.8;
      }
      if (child.userData.isHalo) {
        child.material.color.setHex(system.starColor);
        child.material.opacity = 0.25;
      }
      if (child.userData.isRing) {
        child.material.color.setHex(system.starColor);
        child.material.opacity = 0.55;
      }
    });
    break;
  }
}

function hideMapPanel() {
  document.getElementById('panel').classList.add('hidden');
}

// ───── Lifecycle ─────

export function exit(renderer) {
  renderer.domElement.removeEventListener('click', onMapClick);
  document.getElementById('panel-close').removeEventListener('click', hideMapPanel);
  hideMapPanel();

  // Clean up selection ring
  if (selectionRing) {
    scene.remove(selectionRing);
    selectionRing.geometry.dispose();
    selectionRing.material.dispose();
    selectionRing = null;
  }

  // Clean up DOM labels
  removeLabels();

  if (scene) {
    scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (obj.material.map) obj.material.map.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
  }
  scene = null;
  systemGroups = [];
  hyperlaneGroup = null;
  hyperlaneLines = [];
  jumpCircle = null;
  scanCircle = null;
}

export function update(dt) {
  if (!scene) return;

  // Camera lock: keep galactic core in view
  if (controls.target.length() > 50) {
    controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.05);
  }

  // Pulse hyperlane lines
  const time = performance.now() * 0.001;
  for (const { line, phase } of hyperlaneLines) {
    const osc = 0.35 + 0.1 * Math.sin(time * (2 * Math.PI / 3) + phase);
    line.material.opacity = osc;
  }

  // Update DOM label positions
  updateLabelPositions();

  controls.update();
  return scene;
}

export function getDisplayNameForSystem(system) {
  return getDisplayName(system);
}

export function getScene() { return scene; }
