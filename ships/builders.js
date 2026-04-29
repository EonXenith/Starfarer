import * as THREE from 'three';

// Falcon Scout — needle/dart: long thin fuselage, swept-back fins, single rear engine cone
export function buildScoutModel() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x88aacc, metalness: 0.6, roughness: 0.3 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x4477aa, metalness: 0.7, roughness: 0.2 });
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.8, roughness: 0.2 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: 0x44aaff, emissiveIntensity: 0.8 });

  // Main fuselage — elongated cone
  const fuselage = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.6, 8), bodyMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.z = 0.2;
  group.add(fuselage);

  // Cockpit
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), accentMat);
  cockpit.position.z = 0.85;
  cockpit.scale.set(1, 0.7, 1.3);
  group.add(cockpit);

  // Swept-back fins (left)
  const finGeo = new THREE.BoxGeometry(0.5, 0.02, 0.4);
  const finL = new THREE.Mesh(finGeo, accentMat);
  finL.position.set(-0.25, 0, -0.2);
  finL.rotation.z = -0.15;
  finL.rotation.y = 0.3;
  group.add(finL);

  // Swept-back fins (right)
  const finR = new THREE.Mesh(finGeo, accentMat);
  finR.position.set(0.25, 0, -0.2);
  finR.rotation.z = 0.15;
  finR.rotation.y = -0.3;
  group.add(finR);

  // Engine cone
  const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.3, 8), engineMat);
  engine.rotation.x = Math.PI / 2;
  engine.position.z = -0.6;
  group.add(engine);

  // Engine glow
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.08, 8), glowMat);
  glow.position.z = -0.76;
  group.add(glow);

  group.scale.setScalar(1.2);
  return group;
}

// Comet Cruiser — winged saucer: central disc, two outrigger wings, twin engines
export function buildCruiserModel() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xaabb99, metalness: 0.5, roughness: 0.35 });
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x667755, metalness: 0.6, roughness: 0.3 });
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x445544, metalness: 0.7, roughness: 0.25 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x88ff88, emissive: 0x44cc44, emissiveIntensity: 0.7 });

  // Central disc
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.12, 16), bodyMat);
  disc.rotation.x = Math.PI / 2;
  group.add(disc);

  // Dome
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), bodyMat);
  dome.position.y = 0.06;
  dome.rotation.x = 0;
  group.add(dome);

  // Left wing
  const wingGeo = new THREE.BoxGeometry(0.8, 0.03, 0.35);
  const wingL = new THREE.Mesh(wingGeo, wingMat);
  wingL.position.set(-0.55, 0, -0.05);
  wingL.rotation.z = -0.05;
  group.add(wingL);

  // Right wing
  const wingR = new THREE.Mesh(wingGeo, wingMat);
  wingR.position.set(0.55, 0, -0.05);
  wingR.rotation.z = 0.05;
  group.add(wingR);

  // Left engine
  const engGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.35, 8);
  const engL = new THREE.Mesh(engGeo, engineMat);
  engL.rotation.x = Math.PI / 2;
  engL.position.set(-0.55, 0, -0.25);
  group.add(engL);

  // Right engine
  const engR = new THREE.Mesh(engGeo, engineMat);
  engR.rotation.x = Math.PI / 2;
  engR.position.set(0.55, 0, -0.25);
  group.add(engR);

  // Engine glows
  const glowL = new THREE.Mesh(new THREE.CircleGeometry(0.06, 8), glowMat);
  glowL.position.set(-0.55, 0, -0.43);
  group.add(glowL);
  const glowR = new THREE.Mesh(new THREE.CircleGeometry(0.06, 8), glowMat);
  glowR.position.set(0.55, 0, -0.43);
  group.add(glowR);

  group.scale.setScalar(1.2);
  return group;
}

// Mule Wayfarer — boxy hauler: rectangular main body, four engine pods, cargo ribbing
export function buildWayfarerModel() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xaa8866, metalness: 0.4, roughness: 0.5 });
  const ribMat = new THREE.MeshStandardMaterial({ color: 0x776644, metalness: 0.5, roughness: 0.4 });
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x554433, metalness: 0.6, roughness: 0.3 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff8800, emissiveIntensity: 0.7 });

  // Main rectangular body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 1.0), bodyMat);
  group.add(body);

  // Cargo ribbing (left side)
  for (let i = 0; i < 4; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.06), ribMat);
    rib.position.set(-0.26, 0, -0.3 + i * 0.2);
    group.add(rib);
  }
  // Cargo ribbing (right side)
  for (let i = 0; i < 4; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.06), ribMat);
    rib.position.set(0.26, 0, -0.3 + i * 0.2);
    group.add(rib);
  }

  // Four engine pods
  const positions = [[-0.3, -0.15, -0.55], [0.3, -0.15, -0.55], [-0.3, 0.15, -0.55], [0.3, 0.15, -0.55]];
  positions.forEach(([x, y, z]) => {
    const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.25, 8), engineMat);
    eng.rotation.x = Math.PI / 2;
    eng.position.set(x, y, z);
    group.add(eng);

    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), glowMat);
    glow.position.set(x, y, z - 0.13);
    group.add(glow);
  });

  // Cockpit (small bump on top front)
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.15), ribMat);
  cockpit.position.set(0, 0.22, 0.35);
  group.add(cockpit);

  group.scale.setScalar(1.1);
  return group;
}
