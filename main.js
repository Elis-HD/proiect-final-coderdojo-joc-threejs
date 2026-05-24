import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.152/build/three.module.js";

let scene, camera, renderer;
let carGroup;
let wheelMeshes = [];
let keys = {};

let speed = 0;
let angle = 0;
const maxSpeed = 0.75;
const acceleration = 0.02;
const friction = 0.96;
const steerSpeed = 0.03;

// --- VARIABILE PENTRU COLIZIUNI ȘI OPTIMIZARE ---
let buildingsBoxes = [];
let carBox = new THREE.Box3();
// ------------------------------------------------

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.FogExp2(0x87ceeb, 0.005); // Adăugat ceață pentru adâncime și performanță cinematică

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Umbre mai fine
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(200, 400, 200);
  dirLight.castShadow = true;
  dirLight.shadow.camera.left = -150;
  dirLight.shadow.camera.right = 150;
  dirLight.shadow.camera.top = 150;
  dirLight.shadow.camera.bottom = -150;
  dirLight.shadow.mapSize.width = 1024; // Optimizat dimensiunea umbrelor pentru performanță
  dirLight.shadow.mapSize.height = 1024;
  scene.add(dirLight);

  createGround();
  createModernCity();
  createCar();

  window.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
  window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);
  window.addEventListener("resize", onWindowResize);
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

  // 1. RANDEALĂ DRUMURI OPTIMIZATĂ (O singură geometrie combinată)
  const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
  const roadsCount = (citySize / blockSize) * 2 + 2;
  const roadInstanced = new THREE.InstancedMesh(new THREE.PlaneGeometry(roadWidth, citySize), roadMaterial, roadsCount);
  let roadIndex = 0;
  const dummy = new THREE.Object3D();

  for (let i = -citySize/2; i <= citySize/2; i += blockSize) {
    // Drumuri axa Z
    dummy.position.set(i, 0.01, 0);
    dummy.rotation.set(-Math.PI / 2, 0, 0);
    dummy.updateMatrix();
    roadInstanced.setMatrixAt(roadIndex++, dummy.matrix);

    // Drumuri axa X
    dummy.position.set(0, 0.01, i);
    dummy.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
    dummy.updateMatrix();
    roadInstanced.setMatrixAt(roadIndex++, dummy.matrix);
  }
  roadInstanced.receiveShadow = true;
  scene.add(roadInstanced);

  // 2. TEXTURĂ PROCEDURALĂ MODERNA PENTRU FERESTRE (Fără imagini externe)
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#111111'; // Perete de fundal fațadă
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#e0f7fa'; // Culoare geamuri luminate reflectant
  for(let x=10; x<120; x+=25) {
    for(let y=15; y<120; y+=35) {
      ctx.fillRect(x, y, 15, 20);
    }
  }
  const facadeTexture = new THREE.CanvasTexture(canvas);
  facadeTexture.wrapS = THREE.RepeatWrapping;
  facadeTexture.wrapT = THREE.RepeatWrapping;

  // 3. GENERARE DATE CLĂDIRI PENTRU INSTANCING
  const buildingData = [];
  for (let x = -citySize/2 + blockSize/2; x < citySize/2; x += blockSize) {
    for (let z = -citySize/2 + blockSize/2; z < citySize/2; z += blockSize) {
        if (Math.abs(x) < 25 && Math.abs(z) < 25) continue;

        const h = 15 + Math.random() * 35; // Clădiri mai înalte, zgârie-nori
        const w = 22;
        const d = 22;
        
        buildingData.push({ x, h, z, w, d });

        // Cutie invizibilă de coliziune calculată matematic (Performanță maximă fără geometrii grele)
        const box = new THREE.Box3(
          new THREE.Vector3(x - w/2, 0, z - d/2),
          new THREE.Vector3(x + w/2, h, z + d/2)
        );
        buildingsBoxes.push(box);
    }
  }

  const totalBuildings = buildingData.length;

  // 4. CREARE INSTANCED MESHES (Pentru performanță de top)
  const wallMat = new THREE.MeshStandardMaterial({ 
    map: facadeTexture, 
    roughness: 0.2, 
    metalness: 0.1 
  });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.6 });

  // Geometrii de bază refolosite
  const geomWall = new THREE.BoxGeometry(1, 1, 1);
  const geomRoof = new THREE.BoxGeometry(1, 0.5, 1);
  const geomDoor = new THREE.BoxGeometry(4, 3, 0.2);

  const meshWalls = new THREE.InstancedMesh(geomWall, wallMat, totalBuildings);
  const meshRoofs = new THREE.InstancedMesh(geomRoof, roofMat, totalBuildings);
  const meshDoors = new THREE.InstancedMesh(geomDoor, doorMat, totalBuildings * 2); // Două uși per clădire

  meshWalls.castShadow = true;
  meshWalls.receiveShadow = true;
  meshRoofs.castShadow = true;

  let doorIndex = 0;
  const color = new THREE.Color();

  buildingData.forEach((b, idx) => {
    // A. Corpul Clădirii (Pereți + Ferestre)
    dummy.position.set(b.x, b.h / 2, b.z);
    dummy.scale.set(b.w, b.h, b.d);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    meshWalls.setMatrixAt(idx, dummy.matrix);

    // Culori moderne unice aplicate procedural per instanță clădire
    color.setHSL(Math.random() * 0.1 + 0.55, 0.45, Math.random() * 0.3 + 0.4); // Nuanțe moderne de albastru/cyan/gri sticlos
    meshWalls.setColorAt(idx, color);

    // Repetarea texturii de geamuri scalată corect pe înălțimea clădirii
    // Notă: Pentru instancing perfect se folosește maparea standard, dar culorile variate oferă diversitate vizuală.

    // B. Acoperiș Modern Margine/Terasă
    dummy.position.set(b.x, b.h + 0.25, b.z);
    dummy.scale.set(b.w + 0.4, 1, b.d + 0.4);
    dummy.updateMatrix();
    meshRoofs.setMatrixAt(idx, dummy.matrix);

    // C. Uși Moderne Față/Spate
    // Ușa Față
    dummy.position.set(b.x, 1.5, b.z + b.d/2 + 0.05);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    meshDoors.setMatrixAt(doorIndex++, dummy.matrix);

    // Ușa Spate
    dummy.position.set(b.x, 1.5, b.z - b.d/2 - 0.05);
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

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.2 });
  const cabinMaterial = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6, roughness: 0.1 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 4), bodyMaterial);
  base.position.y = 0.6;
  base.castShadow = true;
  carGroup.add(base);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 2), cabinMaterial);
  cabin.position.set(0, 1.2, -0.2); 
  carGroup.add(cabin);

  const wheelGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 24);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  
  [[-1,0.4,-1.4], [1,0.4,-1.4], [-1,0.4,1.4], [1,0.4,1.4]].forEach(pos => {
    const wheel = new THREE.Mesh(wheelGeom, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(pos[0], pos[1], pos[2]);
    wheel.castShadow = true;
    carGroup.add(wheel);
    wheelMeshes.push(wheel);
  });
}

function checkCollisions() {
  carBox.setFromObject(carGroup);
  for (let i = 0; i < buildingsBoxes.length; i++) {
    if (carBox.intersectsBox(buildingsBoxes[i])) {
      return true;
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
