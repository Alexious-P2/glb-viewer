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
  height: 2
};

const dirFolder = gui.addFolder('Directional Light Orbit');
dirFolder.add(lightParams, 'angle', 0, 360).onChange(updateLightPosition);
dirFolder.add(lightParams, 'radius', 1, 10).onChange(updateLightPosition);
dirFolder.add(lightParams, 'height', -5, 10).onChange(updateLightPosition);
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

// HDRI Setup
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

let envMap, skyboxMesh;
const hdriRotation = { angle: 0 };

const rgbeLoader = new RGBELoader();
rgbeLoader.load(
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_03_1k.hdr',
  (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    envMap = pmremGenerator.fromEquirectangular(texture).texture;

    // Apply environment map
    scene.environment = envMap;

    // Create visible skybox
    const skyGeo = new THREE.SphereGeometry(50, 64, 64);
    const skyMat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      depthWrite: false
    });
    skyboxMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyboxMesh);

    updateHDRIRotation();
  }
);

// HDRI Rotation
function updateHDRIRotation() {
  if (skyboxMesh) {
    skyboxMesh.rotation.y = THREE.MathUtils.degToRad(hdriRotation.angle);
  }
}

const hdriFolder = gui.addFolder('HDRI Environment');
hdriFolder.add(hdriRotation, 'angle', 0, 360).name('Rotation Y').onChange(updateHDRIRotation);
hdriFolder.open();

// Add a test sphere
const geometry = new THREE.SphereGeometry(1, 64, 64);
const material = new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0 });
const sphere = new THREE.Mesh(geometry, material);
sphere.position.y = 1;
scene.add(sphere);

// Load GLB model
const loader = new GLTFLoader();
loader.load('model.glb', function (gltf) {
  scene.add(gltf.scene);
}, undefined, function (error) {
  console.error(error);
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
