import * as THREE from 'three';

const canvas = document.getElementById('phone-stage');
if (!canvas) throw new Error('No canvas');

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
camera.position.set(0, 1.2, 6);
camera.lookAt(0, 0.4, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(canvas.clientWidth, canvas.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const accentLight = new THREE.PointLight(0xeeff35, 2.5, 12);
accentLight.position.set(0, 3, 3);
scene.add(accentLight);

const rimLight = new THREE.PointLight(0xeeff35, 0.8, 10);
rimLight.position.set(-3, 1, -2);
scene.add(rimLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
fillLight.position.set(2, 2, 4);
scene.add(fillLight);

// Phone dimensions (9:19.5 ratio like iPhone)
const phoneW = 0.9;
const phoneH = 1.95;
const phoneDepth = 0.06;
const screenInset = 0.04;
const cornerRadius = 0.12;

// Rounded rectangle shape
function createRoundedRect(w, h, r) {
  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

// Create phone mesh
function createPhone(screenshotUrl, posX, rotY, scale) {
  const group = new THREE.Group();

  // Phone body (dark frame)
  const bodyShape = createRoundedRect(phoneW, phoneH, cornerRadius);
  const bodyGeom = new THREE.ExtrudeGeometry(bodyShape, { depth: phoneDepth, bevelEnabled: false });
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0.6,
    roughness: 0.3,
  });
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.rotation.x = -Math.PI / 2;
  body.position.y = phoneH / 2;
  group.add(body);

  // Screen (textured plane)
  const screenW = phoneW - screenInset * 2;
  const screenH = phoneH - screenInset * 2;
  const screenGeom = new THREE.PlaneGeometry(screenW, screenH);

  const loader = new THREE.TextureLoader();
  const texture = loader.load(screenshotUrl, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
  });

  const screenMat = new THREE.MeshBasicMaterial({ map: texture });
  const screen = new THREE.Mesh(screenGeom, screenMat);
  screen.position.set(0, phoneH / 2, phoneDepth / 2 + 0.001);
  group.add(screen);

  // Notch indicator (small dark bar at top)
  const notchGeom = new THREE.PlaneGeometry(0.25, 0.035);
  const notchMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const notch = new THREE.Mesh(notchGeom, notchMat);
  notch.position.set(0, phoneH - screenInset - 0.04, phoneDepth / 2 + 0.002);
  group.add(notch);

  // Position and rotate
  group.position.x = posX;
  group.rotation.y = rotY;
  group.scale.setScalar(scale);

  return group;
}

// Create the three phones
const centerPhone = createPhone('assets/phone-feed.png', 0, 0, 1);
const leftPhone = createPhone('assets/phone-market.png', -2.1, 0.25, 0.82);
const rightPhone = createPhone('assets/phone-detail.png', 2.1, -0.25, 0.82);

scene.add(centerPhone);
scene.add(leftPhone);
scene.add(rightPhone);

// Reflective ground plane
const groundGeom = new THREE.PlaneGeometry(20, 10);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x080808,
  metalness: 0.95,
  roughness: 0.4,
  transparent: true,
  opacity: 0.6,
});
const ground = new THREE.Mesh(groundGeom, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.02;
scene.add(ground);

// Accent glow sphere (subtle)
const glowGeom = new THREE.SphereGeometry(1.5, 32, 32);
const glowMat = new THREE.MeshBasicMaterial({
  color: 0xeeff35,
  transparent: true,
  opacity: 0.04,
});
const glow = new THREE.Mesh(glowGeom, glowMat);
glow.position.set(0, 1.2, -1);
glow.scale.set(2, 1, 1);
scene.add(glow);

// Mouse tracking
let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

// Auto-rotation + mouse influence
let time = 0;
function animate() {
  requestAnimationFrame(animate);
  time += 0.003;

  // Gentle auto-rotation + mouse offset
  const autoRotY = Math.sin(time) * 0.08;
  const mouseInfluenceX = mouseX * 0.15;
  const mouseInfluenceY = mouseY * 0.05;

  // Rotate entire scene subtly
  scene.rotation.y = autoRotY + mouseInfluenceX;
  camera.position.y = 1.2 - mouseInfluenceY * 0.3;
  camera.lookAt(0, 0.4, 0);

  // Gentle float on phones
  centerPhone.position.y = Math.sin(time * 1.2) * 0.03;
  leftPhone.position.y = Math.sin(time * 1.2 + 1) * 0.025;
  rightPhone.position.y = Math.sin(time * 1.2 + 2) * 0.025;

  // Accent light follows mouse
  accentLight.position.x = mouseX * 2;
  accentLight.position.z = 3 + mouseY * 0.5;

  renderer.render(scene, camera);
}
animate();

// Resize handler
window.addEventListener('resize', () => {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});
