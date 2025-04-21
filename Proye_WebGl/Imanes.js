import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// 1. Configuración inicial
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);
scene.fog = new THREE.FogExp2(0x050510, 0.002);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Postprocessing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5, 0.4, 0.85
));

// 2. Controles
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// 3. Iluminación
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7);
directionalLight.castShadow = true;
scene.add(directionalLight);

// 4. Configuración de imanes
const magnetConfig = {
  strength1: 5,
  strength2: -5,
  distance: 8,
  fieldIntensity: 1.5,
  showField: true,
  showParticles: true,
  physics: true,
  attractionForce: 0.8,
  repulsionForce: 0.5,
  showIndividualFields: true
};

// 5. Materiales
const createMagnetMaterial = (color, emissive) => new THREE.MeshPhysicalMaterial({
  color,
  emissive,
  emissiveIntensity: 0.3,
  metalness: 0.7,
  roughness: 0.3,
  clearcoat: 0.8
});

// 6. Creación de imanes
let magnet1, magnet2;

const createMagnet = (position, strength, color) => {
  const group = new THREE.Group();
  group.position.copy(position);
  group.userData = { strength, fieldLines: new THREE.Group() };
  scene.add(group.userData.fieldLines);

  // Cuerpo del imán
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 2.4, 32),
    createMagnetMaterial(color, color)
  );
  group.add(body);

  // Polos
  const poleGeo = new THREE.SphereGeometry(0.7, 16, 16);
  const northPole = new THREE.Mesh(
    poleGeo, 
    createMagnetMaterial(0xff0000, 0xff0000)
  );
  northPole.position.y = 1.2;
  group.add(northPole);

  const southPole = new THREE.Mesh(
    poleGeo, 
    createMagnetMaterial(0x0000ff, 0x0000ff)
  );
  southPole.position.y = -1.2;
  group.add(southPole);

  return group;
};

// 7. Visualización de campos magnéticos individuales
const updateIndividualFieldLines = (magnet, color) => {
  magnet.userData.fieldLines.clear();
  if (!magnetConfig.showIndividualFields) return;

  const lineMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 });

  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const radius = 0.8;

    // Líneas desde el polo norte
    const startPosNorth = new THREE.Vector3(
      Math.cos(angle) * radius,
      1.2,
      Math.sin(angle) * radius
    ).add(magnet.position);

    const endPosNorth = startPosNorth.clone().add(
      new THREE.Vector3(
        Math.cos(angle) * 5,
        0,
        Math.sin(angle) * 5
      )
    );

    // Líneas desde el polo sur
    const startPosSouth = new THREE.Vector3(
      Math.cos(angle + Math.PI) * radius,
      -1.2,
      Math.sin(angle + Math.PI) * radius
    ).add(magnet.position);

    const endPosSouth = startPosSouth.clone().add(
      new THREE.Vector3(
        Math.cos(angle + Math.PI) * 5,
        0,
        Math.sin(angle + Math.PI) * 5
      )
    );

    // Crear curvas para las líneas de campo
    const curveNorth = new THREE.CubicBezierCurve3(
      startPosNorth,
      startPosNorth.clone().add(new THREE.Vector3(0, 3, 0)),
      endPosNorth.clone().add(new THREE.Vector3(0, -3, 0)),
      endPosNorth
    );

    const curveSouth = new THREE.CubicBezierCurve3(
      startPosSouth,
      startPosSouth.clone().add(new THREE.Vector3(0, -3, 0)),
      endPosSouth.clone().add(new THREE.Vector3(0, 3, 0)),
      endPosSouth
    );

    // Añadir líneas al grupo
    magnet.userData.fieldLines.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curveNorth.getPoints(20)),
        lineMaterial
      )
    );

    magnet.userData.fieldLines.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curveSouth.getPoints(20)),
        lineMaterial
      )
    );
  }
};

// 8. Visualización de interacción entre imanes
const updateInteractionField = () => {
  if (!magnet1 || !magnet2 || !magnetConfig.showField) return;

  const interactionField = new THREE.Group();
  const lineMaterial = new THREE.LineBasicMaterial({ 
    color: 0x00ff00, 
    transparent: true, 
    opacity: 0.8
  });

  // Líneas que conectan polos opuestos
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const radius = 0.8;

    const startPos1 = new THREE.Vector3(
      Math.cos(angle) * radius,
      1.2,
      Math.sin(angle) * radius
    ).add(magnet1.position);

    const startPos2 = new THREE.Vector3(
      Math.cos(angle + Math.PI) * radius,
      -1.2,
      Math.sin(angle + Math.PI) * radius
    ).add(magnet2.position);

    const midPoint = new THREE.Vector3().lerpVectors(startPos1, startPos2, 0.5);

    const curve = new THREE.CubicBezierCurve3(
      startPos1,
      new THREE.Vector3(
        midPoint.x,
        midPoint.y + (magnetConfig.strength1 > 0 ? 4 : -4),
        midPoint.z
      ),
      new THREE.Vector3(
        midPoint.x,
        midPoint.y + (magnetConfig.strength2 > 0 ? 4 : -4),
        midPoint.z
      ),
      startPos2
    );

    interactionField.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(30)),
        lineMaterial
      )
    );
  }

  // Limpiar y añadir nuevas líneas
  scene.remove(scene.getObjectByName('interactionField'));
  interactionField.name = 'interactionField';
  scene.add(interactionField);
};

// 9. Sistema de partículas para visualización de campo
const particles = new THREE.Points(
  new THREE.BufferGeometry(),
  new THREE.PointsMaterial({
    size: 0.1,
    color: 0x00ffff,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  })
);
scene.add(particles);

const updateParticles = () => {
  if (!magnet1 || !magnet2 || !magnetConfig.showParticles) {
    particles.visible = false;
    return;
  }

  particles.visible = true;
  const particleCount = 1000;
  const positions = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    // Posición aleatoria cerca de los imanes
    positions[i3] = (Math.random() - 0.5) * 20;
    positions[i3 + 1] = (Math.random() - 0.5) * 10;
    positions[i3 + 2] = (Math.random() - 0.5) * 20;
  }

  particles.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
};

// 10. Física de interacción
const updatePhysics = () => {
  if (!magnet1 || !magnet2 || !magnetConfig.physics) return;

  const direction = new THREE.Vector3().subVectors(magnet2.position, magnet1.position);
  const distance = direction.length();
  const normalizedDir = direction.clone().normalize();

  const samePole = Math.sign(magnet1.userData.strength) === Math.sign(magnet2.userData.strength);
  const forceMagnitude = samePole 
    ? magnetConfig.repulsionForce * 10 / Math.max(distance * distance, 0.1)
    : magnetConfig.attractionForce * 15 / Math.max(distance * distance, 0.1);

  const force = normalizedDir.multiplyScalar(forceMagnitude * 0.01);
  magnet1.position.add(force.clone().multiplyScalar(-1));
  magnet2.position.add(force);

  // Efecto de oscilación cuando están cerca
  if (distance < 5) {
    const oscillation = Math.sin(Date.now() * 0.002) * 0.05;
    magnet1.position.y += oscillation;
    magnet2.position.y -= oscillation;
  }
};

// 11. GUI de control
const gui = new GUI();
const mag1 = gui.addFolder('Imán 1');
mag1.add(magnetConfig, 'strength1', -15, 15).name('Fuerza').onChange(() => {
  magnet1.userData.strength = magnetConfig.strength1;
  updateIndividualFieldLines(magnet1, 0xff0000);
});
const mag2 = gui.addFolder('Imán 2');
mag2.add(magnetConfig, 'strength2', -15, 15).name('Fuerza').onChange(() => {
  magnet2.userData.strength = magnetConfig.strength2;
  updateIndividualFieldLines(magnet2, 0x0000ff);
});
const field = gui.addFolder('Campo Magnético');
field.add(magnetConfig, 'fieldIntensity', 0.1, 3).name('Intensidad');
field.add(magnetConfig, 'showField').name('Mostrar Interacción');
field.add(magnetConfig, 'showIndividualFields').name('Mostrar Campos Individuales');
field.add(magnetConfig, 'showParticles').name('Mostrar Partículas');
const physics = gui.addFolder('Física');
physics.add(magnetConfig, 'physics').name('Activar Física');
physics.add(magnetConfig, 'attractionForce', 0.1, 2).name('Fuerza Atracción');
physics.add(magnetConfig, 'repulsionForce', 0.1, 2).name('Fuerza Repulsión');

// 12. Inicialización
magnet1 = createMagnet(new THREE.Vector3(-5, 0, 0), magnetConfig.strength1, 0xaaaaaa);
magnet2 = createMagnet(new THREE.Vector3(5, 0, 0), magnetConfig.strength2, 0xaaaaaa);
scene.add(magnet1, magnet2);

updateIndividualFieldLines(magnet1, 0xff0000); // Rojo para imán 1
updateIndividualFieldLines(magnet2, 0x0000ff); // Azul para imán 2
updateParticles();

// 13. Animación
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  updatePhysics();
  updateInteractionField();
  
  // Actualizar partículas según campos magnéticos
  if (particles.visible) {
    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const pos = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
      
      // Fuerza del imán 1
      const dir1 = new THREE.Vector3().subVectors(pos, magnet1.position).normalize();
      const force1 = dir1.multiplyScalar(magnet1.userData.strength * 0.0005 * magnetConfig.fieldIntensity);
      
      // Fuerza del imán 2
      const dir2 = new THREE.Vector3().subVectors(pos, magnet2.position).normalize();
      const force2 = dir2.multiplyScalar(magnet2.userData.strength * 0.0005 * magnetConfig.fieldIntensity);
      
      // Aplicar fuerzas
      positions[i] += force1.x + force2.x;
      positions[i + 1] += force1.y + force2.y;
      positions[i + 2] += force1.z + force2.z;
    }
    particles.geometry.attributes.position.needsUpdate = true;
  }

  // Efecto de pulso en los polos
  const pulseIntensity = Math.sin(elapsed * 2) * 0.1 + 0.3;
  magnet1.children[1].material.emissiveIntensity = pulseIntensity;
  magnet1.children[2].material.emissiveIntensity = pulseIntensity;
  magnet2.children[1].material.emissiveIntensity = pulseIntensity;
  magnet2.children[2].material.emissiveIntensity = pulseIntensity;

  controls.update();
  composer.render(delta);
}

// 14. Manejo de redimensionamiento
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

animate();