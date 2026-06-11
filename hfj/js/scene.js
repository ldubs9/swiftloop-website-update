// Hero gemstone — faceted stone slowly turning on a velvet field
import * as THREE from 'three';

const canvas = document.getElementById('scene');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  // ——— the stone: low-poly icosahedron reads as a cut gem, squashed like a cushion
  const geo = new THREE.IcosahedronGeometry(1.55, 0);
  geo.scale(1, 0.82, 1);
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x8a4a22,
    metalness: 0.25,
    roughness: 0.18,
    flatShading: true,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
    emissive: 0x1d0d04,
  });
  const gem = new THREE.Mesh(geo, mat);

  // wire "girdle" overlay for a drafted, lapidary feel
  const wire = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo, 12),
    new THREE.LineBasicMaterial({ color: 0xd77a3e, transparent: true, opacity: 0.28 })
  );
  gem.add(wire);

  const group = new THREE.Group();
  group.add(gem);
  scene.add(group);

  // ——— dust: faint drifting particles like souq lamplight
  const dustCount = 240;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 14;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 9;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xece5d8, size: 0.018, transparent: true, opacity: 0.45, sizeAttenuation: true,
  }));
  scene.add(dust);

  // ——— lighting: one warm key, one cool rim — gem dispersion in two notes
  scene.add(new THREE.AmbientLight(0x2a2230, 1.2));
  const key = new THREE.PointLight(0xffb877, 60, 0, 2);
  key.position.set(4, 3, 5);
  scene.add(key);
  const rim = new THREE.PointLight(0x6f86ff, 28, 0, 2);
  rim.position.set(-5, -2, 3);
  scene.add(rim);
  const top = new THREE.DirectionalLight(0xffffff, 0.6);
  top.position.set(0, 6, 2);
  scene.add(top);

  // ——— layout: keep the stone in the upper-right on wide screens, centered on mobile
  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const mobile = w < 880;
    group.position.set(mobile ? 0.4 : 1.9, mobile ? 1.5 : 0.55, 0);
    const s = mobile ? 0.6 : 1;
    group.scale.set(s, s, s);
  }
  layout();
  window.addEventListener('resize', layout);

  // ——— pointer parallax
  let mx = 0, my = 0, tx = 0, ty = 0;
  window.addEventListener('pointermove', (e) => {
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  const clock = new THREE.Clock();
  let raf;
  function tick() {
    const t = clock.getElapsedTime();
    if (!reduced) {
      gem.rotation.y = t * 0.22;
      gem.rotation.x = Math.sin(t * 0.16) * 0.25 + 0.15;
      group.position.y += Math.sin(t * 0.8) * 0.0008;
      dust.rotation.y = t * 0.012;
      mx += (tx - mx) * 0.04;
      my += (ty - my) * 0.04;
      group.rotation.y = mx * 0.18;
      group.rotation.x = my * 0.1;
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  tick();

  // pause when tab hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else { clock.getDelta(); tick(); }
  });
}
