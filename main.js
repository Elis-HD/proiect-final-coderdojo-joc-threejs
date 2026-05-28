import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152/build/three.module.js";

let scene, camera, renderer;
let carGroup;
let wheelMeshes = [];
let keys = {};

let speed = 0;
let angle = 0;
const maxSpeed = 1;
const acceleration = 0.015;
const friction = 0.96;
const steerSpeed = 0.02;

let buildingsBoxes = [];
let zombies = [];
let zombiesBoxes = [];
let carBox = new THREE.Box3();
let speedHud;
let zombieHud;

const zombieCount = 80;
let zombiesRemaining = zombieCount;

init();
animate();

function init() {
   scene = new THREE.Scene();
   scene.background = new THREE.Color(0x1b1f1b);
   scene.fog = new THREE.FogExp2(0x2f3b2f, 0.0125);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  speedHud = document.createElement("div");
  speedHud.style.position = "absolute";
  speedHud.style.bottom = "20px";
  speedHud.style.left = "20px";
  speedHud.style.padding = "10px 14px";
  speedHud.style.background = "rgba(0,0,0,0.5)";
  speedHud.style.color = "white";
  speedHud.style.fontFamily = "Arial";
  speedHud.style.fontSize = "18px";
  speedHud.style.borderRadius = "8px";
  speedHud.style.backdropFilter = "blur(6px)";
  speedHud.innerHTML = "0 km/h";
  document.body.appendChild(speedHud);

  zombieHud = document.createElement("div");

  zombieHud.style.position = "absolute";
  zombieHud.style.top = "20px";
  zombieHud.style.left = "20px";
  zombieHud.style.padding = "10px 14px";
  zombieHud.style.background = "rgba(0,0,0,0.5)";
  zombieHud.style.color = "#7CFF7C";
  zombieHud.style.fontFamily = "Arial";
  zombieHud.style.fontSize = "20px";
  zombieHud.style.fontWeight = "bold";
  zombieHud.style.borderRadius = "8px";
  zombieHud.style.backdropFilter = "blur(6px)";
  zombieHud.innerHTML = `Zombii rămași: ${zombiesRemaining}`;

  document.body.appendChild(zombieHud);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(200, 400, 200);
  dirLight.castShadow = true;
  dirLight.shadow.camera.left = -150;
  dirLight.shadow.camera.right = 150;
  dirLight.shadow.camera.top = 150;
  dirLight.shadow.camera.bottom = -150;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  scene.add(dirLight);

  createGround();
  createModernCity();
  createCar();
  createZombies();

  window.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
  window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);
  window.addEventListener("resize", onWindowResize);
}

function showYouWinPopup() {
  if (document.getElementById("you-win-popup")) return;

  const popup = document.createElement("div");
  popup.id = "you-win-popup";
  popup.innerText = "YOU WIN!";

  popup.style.position = "fixed";
  popup.style.top = "50%";
  popup.style.left = "50%";
  popup.style.transform = "translate(-50%, -50%) scale(0.5)";
  popup.style.padding = "30px 60px";
  popup.style.fontSize = "64px";
  popup.style.fontFamily = "'Press Start 2P', cursive";
  popup.style.color = "#FFD700";
  popup.style.background = "rgba(0,0,0,0.85)";
  popup.style.border = "4px solid #FFD700";
  popup.style.borderRadius = "12px";
  popup.style.textAlign = "center";
  popup.style.zIndex = "9999";
  popup.style.textShadow = `
    0 0 10px #FFD700,
    0 0 20px #FFA500,
    0 0 40px #FF4500
  `;
  popup.style.boxShadow = `
    0 0 20px #FFD700,
    0 0 40px #FFA500
  `;
  popup.style.opacity = "0";
  popup.style.transition = "all 0.5s ease";

  document.body.appendChild(popup);

  requestAnimationFrame(() => {
    popup.style.opacity = "1";
    popup.style.transform = "translate(-50%, -50%) scale(1)";
  });
}

function updateZombieHUD() {
  zombieHud.innerHTML = `Zombii rămași: ${zombiesRemaining}`;

  if (zombiesRemaining <= 0) {
    zombieHud.innerHTML = "TOȚI ZOMBII AU FOST ELIMINAȚI!";
    zombieHud.style.color = "#FFD700";

    showYouWinPopup();
  }
}


function createGround() {
  const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x245c22, roughness: 0.8 });
  const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);
}

function createModernCity() {
  const citySize = 800;
  const roadWidth = 12;
  const blockSize = 50;

  const roadMaterial = new THREE.MeshStandardMaterial({
  color: 0x303030,
  roughness: 0.95,
  metalness: 0.02
});

const lineMaterial = new THREE.MeshStandardMaterial({
  color: 0xbdb79f,
  roughness: 1,
  transparent: true,
  opacity: 0.65
});

  const roadsCount = (citySize / blockSize) * 2 + 2;

  const roadGeometry = new THREE.PlaneGeometry(roadWidth, citySize);
  const roadInstanced = new THREE.InstancedMesh(
    roadGeometry,
    roadMaterial,
    roadsCount
  );

  const lineWidth = 0.15;
  const lineLength = 2;
  const lineGap = 2;

  const linesPerRoad = Math.floor(citySize / (lineLength + lineGap));
  const totalLines = roadsCount * linesPerRoad;

  const lineGeometry = new THREE.PlaneGeometry(lineWidth, lineLength);

  const lineInstanced = new THREE.InstancedMesh(
    lineGeometry,
    lineMaterial,
    totalLines
  );

  const sidewalkGeometry = new THREE.PlaneGeometry(blockSize, blockSize);
  const sidewalkMaterial = new THREE.MeshStandardMaterial({
    color: 0x555555,
    roughness: 0.9
  });

  const sidewalkCount =
    (citySize / blockSize) * (citySize / blockSize);

  const sidewalkMesh = new THREE.InstancedMesh(
    sidewalkGeometry,
    sidewalkMaterial,
    sidewalkCount
  );

  const dummy = new THREE.Object3D();

  let roadIndex = 0;
  let lineIndex = 0;
  let sidewalkIndex = 0;

  for (let i = -citySize / 2; i <= citySize / 2; i += blockSize) {

    dummy.position.set(i, 0.01, 0);
    dummy.rotation.set(-Math.PI / 2, 0, 0);
    dummy.updateMatrix();
    roadInstanced.setMatrixAt(roadIndex++, dummy.matrix);

    for (
      let z = -citySize / 2 + lineLength / 2;
      z < citySize / 2;
      z += lineLength + lineGap
    ) {
      dummy.position.set(i, 0.02, z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      lineInstanced.setMatrixAt(lineIndex++, dummy.matrix);
    }

    dummy.position.set(0, 0.01, i);
    dummy.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
    dummy.updateMatrix();
    roadInstanced.setMatrixAt(roadIndex++, dummy.matrix);

    for (
      let x = -citySize / 2 + lineLength / 2;
      x < citySize / 2;
      x += lineLength + lineGap
    ) {
      dummy.position.set(x, 0.02, i);
      dummy.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
      dummy.updateMatrix();
      lineInstanced.setMatrixAt(lineIndex++, dummy.matrix);
    }
  }

  for (
    let x = -citySize / 2 + blockSize / 2;
    x < citySize / 2;
    x += blockSize
  ) {
    for (
      let z = -citySize / 2 + blockSize / 2;
      z < citySize / 2;
      z += blockSize
    ) {

      dummy.position.set(x, 0.005, z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();

      sidewalkMesh.setMatrixAt(sidewalkIndex++, dummy.matrix);
    }
  }

  roadInstanced.receiveShadow = true;
  lineInstanced.receiveShadow = true;

  sidewalkMesh.receiveShadow = true;
  sidewalkMesh.castShadow = true;

  scene.add(roadInstanced);
  scene.add(lineInstanced);
  scene.add(sidewalkMesh);

  const canvas = document.createElement('canvas');
canvas.width = 128;
canvas.height = 128;

const ctx = canvas.getContext('2d');

ctx.fillStyle = '#2a2a2a';
ctx.fillRect(0, 0, 128, 128);

for (let i = 0; i < 200; i++) {
  ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
  ctx.fillRect(
    Math.random() * 128,
    Math.random() * 128,
    Math.random() * 8,
    Math.random() * 8
  );
}

for (let x = 10; x < 120; x += 25) {
  for (let y = 15; y < 120; y += 35) {

    const broken = Math.random() < 0.35;

    ctx.fillStyle = broken ? '#222' : '#9fc5d1';
    ctx.fillRect(x, y, 15, 20);

    if (broken) {
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 15, y + 20);

      ctx.moveTo(x + 15, y);
      ctx.lineTo(x, y + 20);

      ctx.moveTo(x + 7, y);
      ctx.lineTo(x + 3, y + 20);

      ctx.stroke();
    }

    if (Math.random() < 0.15) {
      ctx.fillStyle = '#111';
      ctx.fillRect(x, y, 15, 20);
    }
  }
}

for (let i = 0; i < 30; i++) {

  const startX = Math.random() * 128;
  const startY = Math.random() * 128;

  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(startX, startY);

  let x = startX;
  let y = startY;

  for (let j = 0; j < 5; j++) {
    x += (Math.random() - 0.5) * 10;
    y += Math.random() * 10;

    ctx.lineTo(x, y);
  }

  ctx.stroke();
}

for (let i = 0; i < 18; i++) {

  const vineX = Math.random() * 128;

  ctx.strokeStyle = '#355e3b';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(vineX, 0);

  let currentX = vineX;

  for (let y = 0; y < 128; y += 10) {
    currentX += (Math.random() - 0.5) * 8;
    ctx.lineTo(currentX, y);
  }

  ctx.stroke();
}

ctx.fillStyle = 'rgba(120,20,20,0.35)';
ctx.font = '10px Arial';
ctx.fillText('HELP', 20, 90);
ctx.fillText('RUN', 70, 45);

const facadeTexture = new THREE.CanvasTexture(canvas);

facadeTexture.wrapS = THREE.RepeatWrapping;
facadeTexture.wrapT = THREE.RepeatWrapping;
facadeTexture.magFilter = THREE.NearestFilter;

  const buildingData = [];

  for (let x = -citySize / 2 + blockSize / 2; x < citySize / 2; x += blockSize) {
    for (let z = -citySize / 2 + blockSize / 2; z < citySize / 2; z += blockSize) {

      if (Math.abs(x) < 25 && Math.abs(z) < 25) continue;

      const h = 15 + Math.random() * 35;
      const w = 22;
      const d = 22;

      buildingData.push({ x, h, z, w, d });

      const box = new THREE.Box3(
        new THREE.Vector3(x - w / 2, 0, z - d / 2),
        new THREE.Vector3(x + w / 2, h, z + d / 2)
      );

      buildingsBoxes.push(box);
    }
  }

  const totalBuildings = buildingData.length;

  const wallMat = new THREE.MeshStandardMaterial({
  map: facadeTexture,
  roughness: 0.95,
  metalness: 0.02
});

const roofMat = new THREE.MeshStandardMaterial({
  color: 0x1b1b1b,
  roughness: 1
});

const doorMat = new THREE.MeshStandardMaterial({
  color: 0x3b2a22,
  roughness: 1
});

  const geomWall = new THREE.BoxGeometry(1, 1, 1);
  const geomRoof = new THREE.BoxGeometry(1, 0.5, 1);
  const geomDoor = new THREE.BoxGeometry(4, 3, 0.2);

  const meshWalls = new THREE.InstancedMesh(geomWall, wallMat, totalBuildings);
  const meshRoofs = new THREE.InstancedMesh(geomRoof, roofMat, totalBuildings);
  const meshDoors = new THREE.InstancedMesh(geomDoor, doorMat, totalBuildings * 2);

  meshWalls.castShadow = true;
  meshWalls.receiveShadow = true;
  meshRoofs.castShadow = true;

  let doorIndex = 0;
  const color = new THREE.Color();

  buildingData.forEach((b, idx) => {

    dummy.position.set(b.x, b.h / 2, b.z);
    dummy.scale.set(b.w, b.h, b.d);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    meshWalls.setMatrixAt(idx, dummy.matrix);

    color.setHSL(Math.random() * 0.1 + 0.55, 0.45, Math.random() * 0.3 + 0.4);
    meshWalls.setColorAt(idx, color);

    dummy.position.set(b.x, b.h + 0.25, b.z);
    dummy.scale.set(b.w + 0.4, 1, b.d + 0.4);
    dummy.updateMatrix();
    meshRoofs.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(b.x, 1.5, b.z + b.d / 2 + 0.05);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    meshDoors.setMatrixAt(doorIndex++, dummy.matrix);

    dummy.position.set(b.x, 1.5, b.z - b.d / 2 - 0.05);
    dummy.rotation.set(0, Math.PI, 0);
    dummy.updateMatrix();
    meshDoors.setMatrixAt(doorIndex++, dummy.matrix);
  });

  scene.add(meshWalls);
  scene.add(meshRoofs);
  scene.add(meshDoors);
}

function createCar() {
  carGroup = new THREE.Group();
  scene.add(carGroup);

  const randomColor = new THREE.Color(
  Math.random(),
  Math.random(),
  Math.random()
);

const bodyMaterial = new THREE.MeshStandardMaterial({
  color: randomColor,
  roughness: 0.1,
  metalness: 0.8
});
  const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.7, roughness: 0.1 });
  const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const rimMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });
  const lightMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0dd, emissiveIntensity: 1 });
  const tailLightMaterial = new THREE.MeshStandardMaterial({ color: 0xcc0000, emissive: 0x990000 });

  const carBody = new THREE.Group();

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.4, 4.2), bodyMaterial);
  base.position.y = 0.5;
  base.castShadow = true;
  base.receiveShadow = true;
  carBody.add(base);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.35, 1.2), bodyMaterial);
  hood.position.set(0, 0.775, 1.5);
  hood.castShadow = true;
  carBody.add(hood);

  const cabinGeom = new THREE.BufferGeometry();
  const vertices = new Float32Array([

    -0.8, 0.7,  0.9,   0.8, 0.7,  0.9,  -0.75, 1.3,  0.2,
     0.8, 0.7,  0.9,   0.75, 1.3,  0.2,  -0.75, 1.3,  0.2,
    -0.75, 1.3, 0.2,   0.75, 1.3, 0.2,  -0.75, 1.3, -1.2,
     0.75, 1.3, 0.2,   0.75, 1.3, -1.2, -0.75, 1.3, -1.2,
    -0.75, 1.3, -1.2,  0.75, 1.3, -1.2, -0.8,  0.7, -1.5,
     0.75, 1.3, -1.2,  0.8,  0.7, -1.5, -0.8,  0.7, -1.5
  ]);
  cabinGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  cabinGeom.computeVertexNormals();
  const cabin = new THREE.Mesh(cabinGeom, bodyMaterial);
  cabin.castShadow = true;
  carBody.add(cabin);

  const sideWindows = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.5, 1.3), glassMaterial);
  sideWindows.position.set(0, 1.0, -0.5);
  carBody.add(sideWindows);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.05, 0.8), glassMaterial);
  windshield.position.set(0, 1.05, 0.55);
  windshield.rotation.x = 0.6;
  carBody.add(windshield);

  const headlightGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 16);
  headlightGeom.rotateX(Math.PI / 2);
  const leftLight = new THREE.Mesh(headlightGeom, lightMaterial);
  leftLight.position.set(-0.6, 0.75, 2.1);
  const rightLight = leftLight.clone();
  rightLight.position.x = 0.6;
  carBody.add(leftLight, rightLight);

  const tailLightGeom = new THREE.BoxGeometry(0.3, 0.1, 0.05);
  const leftTail = new THREE.Mesh(tailLightGeom, tailLightMaterial);
  leftTail.position.set(-0.6, 0.65, -2.1);
  const rightTail = leftTail.clone();
  rightTail.position.x = 0.6;
  carBody.add(leftTail, rightTail);

  const mirrorGeom = new THREE.BoxGeometry(0.15, 0.1, 0.2);
  const leftMirror = new THREE.Mesh(mirrorGeom, bodyMaterial);
  leftMirror.position.set(-0.9, 0.9, 0.6);
  const rightMirror = leftMirror.clone();
  rightMirror.position.x = 0.9;
  carBody.add(leftMirror, rightMirror);

  carGroup.add(carBody);

  const wheelPositions = [
    [-0.85, 0.35, -1.3],
    [0.85, 0.35, -1.3],
    [-0.85, 0.35, 1.3],
    [0.85, 0.35, 1.3]
  ];

  wheelPositions.forEach(pos => {
    const wheelGroup = new THREE.Group();

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.35, 32), tireMaterial);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.36, 16), rimMaterial);
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.44, 0.44), rimMaterial);
    wheelGroup.add(spoke);

    wheelGroup.position.set(pos[0], pos[1], pos[2]);
    carGroup.add(wheelGroup);
    wheelMeshes.push(wheelGroup); 
  });
}

function createZombies() {
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3f5f3f }); // haine verde murdar
const headMat = new THREE.MeshStandardMaterial({ color: 0x7a8f6a }); // piele zombie gri-verzuie

  const bodyGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.6, 8);
  const headGeo = new THREE.SphereGeometry(0.25, 8, 8);

  const count = 80;

  for (let i = 0; i < count; i++) {
    const group = new THREE.Group();

    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.8;
    body.castShadow = true;

    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.6;
    head.castShadow = true;

    group.add(body);
    group.add(head);

    let x, z;
    let validPosition = false;

while (!validPosition) {

  x = (Math.random() - 0.5) * 700;
  z = (Math.random() - 0.5) * 700;

  validPosition = true;

  for (const box of buildingsBoxes) {

    if (
      x > box.min.x &&
      x < box.max.x &&
      z > box.min.z &&
      z < box.max.z
    ) {
      validPosition = false;
      break;
    }
  }
}

group.position.set(x, 0, z);

    scene.add(group);
    zombies.push(group);

    zombiesBoxes.push(new THREE.Box3());
  }
}

function checkCollisions() {
  carBox.setFromObject(carGroup);

  for (let i = 0; i < buildingsBoxes.length; i++) {
    if (carBox.intersectsBox(buildingsBoxes[i])) {
      return true;
    }
  }

for (let i = zombies.length - 1; i >= 0; i--) {
  zombiesBoxes[i].setFromObject(zombies[i]);

  if (carBox.intersectsBox(zombiesBoxes[i])) {

    const pos = zombies[i].position.clone();

    const bloodGeometry = new THREE.CircleGeometry(1.2, 16);

    const bloodMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B0000,
      transparent: true,
      opacity: 0.8
    });

    const blood = new THREE.Mesh(bloodGeometry, bloodMaterial);

    blood.rotation.x = -Math.PI / 2; // pe sol
    blood.position.set(pos.x, 0.05, pos.z);

    scene.add(blood);

    scene.remove(zombies[i]);

    zombies.splice(i, 1);
    zombiesBoxes.splice(i, 1);

    zombiesRemaining--;

    if (zombiesRemaining < 0) {
      zombiesRemaining = 0;
    }

    updateZombieHUD();
  }
}

return false;
}

function updateCar() {
  if (keys["w"]) speed += acceleration;
  if (keys["s"]) speed -= acceleration;
  speed *= friction;
  speed = Math.max(-maxSpeed, Math.min(speed, maxSpeed));

  const prevPosition = carGroup.position.clone();
  const prevAngle = angle;

  if (Math.abs(speed) > 0.01) {
    const direction = speed > 0 ? 1 : -1;
    if (keys["a"]) angle += steerSpeed * direction;
    if (keys["d"]) angle -= steerSpeed * direction;
  }

  carGroup.rotation.y = angle;
  carGroup.translateZ(-speed);

  if (checkCollisions()) {
    carGroup.position.copy(prevPosition);
    angle = prevAngle;
    carGroup.rotation.y = angle;
    speed = 0;
  }

const kmh = Math.abs(speed) * 240;
  speedHud.innerHTML = `${kmh.toFixed(0)} km/h`;

  wheelMeshes.forEach((w, i) => {
    w.rotation.x += speed * 0.5;
    if (i < 2) {
      if (keys["a"]) w.rotation.y = 0.4;
      else if (keys["d"]) w.rotation.y = -0.4;
      else w.rotation.y = 0;
    }
  });
}

function updateCamera() {
  const offset = new THREE.Vector3(0, 5, 12).applyQuaternion(carGroup.quaternion);
  camera.position.lerp(carGroup.position.clone().add(offset), 0.1);
  camera.lookAt(carGroup.position);
}

function animate() {
  requestAnimationFrame(animate);
  updateCar();
  updateCamera();
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
