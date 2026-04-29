import * as THREE from 'three';
import { ships } from '../data.js';
import { buildScoutModel, buildCruiserModel, buildWayfarerModel } from '../ships/builders.js';

const builders = { scout: buildScoutModel, cruiser: buildCruiserModel, wayfarer: buildWayfarerModel };

let previewScenes = [];
let previewCameras = [];
let previewModels = [];
let animating = false;
let rafId = null;

export function enter(renderer, onSelect) {
  const container = document.getElementById('ship-select');
  container.classList.remove('hidden', 'fade-out');
  const cardsEl = document.getElementById('ship-cards');
  cardsEl.innerHTML = '';

  previewScenes = [];
  previewCameras = [];
  previewModels = [];

  // Put canvas above overlay so ship previews are visible through transparent areas
  const canvas = renderer.domElement;
  canvas.style.position = 'fixed';
  canvas.style.zIndex = '150';
  canvas.style.pointerEvents = 'none';

  ships.forEach((ship, idx) => {
    const card = document.createElement('div');
    card.className = 'ship-card';

    const previewDiv = document.createElement('div');
    previewDiv.className = 'preview-container';
    previewDiv.setAttribute('data-ship-index', idx);
    card.appendChild(previewDiv);

    const name = document.createElement('h3');
    name.textContent = ship.name;
    card.appendChild(name);

    const tagline = document.createElement('p');
    tagline.className = 'tagline';
    tagline.textContent = ship.tagline;
    card.appendChild(tagline);

    const stats = document.createElement('div');
    stats.className = 'stat-bars';
    const maxVal = 40;
    const statData = [
      { label: 'Jump', value: ship.jumpRange },
      { label: 'Speed', value: ship.sublightSpeed * 20 },
      { label: 'Scan', value: ship.scanRange },
      { label: 'Turn', value: ship.turnResponsiveness * 20 }
    ];
    statData.forEach(s => {
      const row = document.createElement('div');
      row.className = 'stat-row';
      row.innerHTML = `<span class="label">${s.label}</span><div class="bar"><div class="bar-fill" style="width:${(s.value / maxVal) * 100}%"></div></div>`;
      stats.appendChild(row);
    });
    card.appendChild(stats);

    const btn = document.createElement('button');
    btn.className = 'choose-btn';
    btn.textContent = 'Choose this ship';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectShip(ship, container, onSelect, renderer);
    });
    card.appendChild(btn);

    card.addEventListener('click', () => selectShip(ship, container, onSelect, renderer));
    cardsEl.appendChild(card);

    // Set up preview scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 200 / 150, 0.1, 50);
    camera.position.set(0, 0.5, 3);
    camera.lookAt(0, 0, 0);

    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(2, 3, 4);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404060, 1.5));

    const model = builders[ship.id]();
    scene.add(model);

    previewScenes.push(scene);
    previewCameras.push(camera);
    previewModels.push(model);
  });

  animating = true;
  renderPreviews(renderer);
}

function renderPreviews(renderer) {
  if (!animating) return;
  rafId = requestAnimationFrame(() => renderPreviews(renderer));

  // Clear canvas to fully transparent
  renderer.setClearColor(0x000000, 0);
  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  renderer.setScissor(0, 0, window.innerWidth, window.innerHeight);
  renderer.setScissorTest(false);
  renderer.clear();

  const containers = document.querySelectorAll('.preview-container');
  if (containers.length === 0) return;

  renderer.setScissorTest(true);

  containers.forEach((el, idx) => {
    if (idx >= previewScenes.length) return;

    const rect = el.getBoundingClientRect();
    const canvasEl = renderer.domElement;
    const canvasRect = canvasEl.getBoundingClientRect();

    const left = rect.left - canvasRect.left;
    const bottom = canvasRect.height - (rect.top - canvasRect.top) - rect.height;
    const width = rect.width;
    const height = rect.height;

    if (width <= 0 || height <= 0) return;

    renderer.setViewport(left, bottom, width, height);
    renderer.setScissor(left, bottom, width, height);

    previewModels[idx].rotation.y += 0.005;
    renderer.render(previewScenes[idx], previewCameras[idx]);
  });

  renderer.setScissorTest(false);
}

function selectShip(ship, container, onSelect, renderer) {
  animating = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  container.classList.add('fade-out');
  setTimeout(() => {
    container.classList.add('hidden');
    // Restore canvas to normal positioning
    const canvas = renderer.domElement;
    canvas.style.position = '';
    canvas.style.zIndex = '';
    canvas.style.pointerEvents = '';
    onSelect(ship);
  }, 400);
}

export function exit() {
  animating = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  const container = document.getElementById('ship-select');
  container.classList.add('hidden');
}

export function update() {}
