import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.18/+esm';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(2, 2, 5);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// GUI
const gui = new GUI();

// Directional Light
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
scene.add(directionalLight);
const lightHelper = new THREE.DirectionalLightHelper(directionalLight, 0.5);
scene.add(lightHelper);

const lightParams = {
  angle: 0,
  radius: 5,
  height: 2,
  intensity: 1
};

const dirFolder = gui.addFolder('Directional Light Orbit');
dirFolder.add(lightParams, 'angle', 0, 360).onChange(updateLightPosition);
dirFolder.add(lightParams, 'radius', 1, 10).onChange(updateLightPosition);
dirFolder.add(lightParams, 'height', -5, 10).onChange(updateLightPosition);
dirFolder.add(lightParams, 'intensity', 0, 5, 0.01).name('Intensity').onChange(value => {
  directionalLight.intensity = value;
});
dirFolder.open();

function updateLightPosition() {
  const rad = THREE.MathUtils.degToRad(lightParams.angle);
  directionalLight.position.set(
    Math.cos(rad) * lightParams.radius,
    lightParams.height,
    Math.sin(rad) * lightParams.radius
  );
  directionalLight.lookAt(0, 0, 0);
  lightHelper.update();
}
updateLightPosition();

// Ambient Light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const ambientFolder = gui.addFolder('Ambient Light');
ambientFolder.add(ambientLight, 'intensity', 0, 2, 0.01).name('Intensity');
ambientFolder.open();

// Load GLB model
const loader = new GLTFLoader();
loader.load('model.glb', (gltf) => {
  console.log('Model loaded:', gltf);  // ✅ Check this logs something
  scene.add(gltf.scene);
}, undefined, error => {
  console.error('GLB Load Error:', error);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Responsive resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
