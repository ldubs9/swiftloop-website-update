// SwiftLoop hero — particle torus-knot "loop", mouse-reactive, scroll-parallaxed
import * as THREE from "three";

const canvas = document.getElementById("scene");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (canvas && !reduceMotion) initScene();

function initScene() {
  const isMobile = window.innerWidth < 768;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a0c, 0.06);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, isMobile ? 13 : 9.5);

  // --- particles along a torus knot, with radial scatter ---
  const COUNT = isMobile ? 4500 : 9000;
  const curve = new THREE.Curve();
  curve.getPoint = function (t) {
    // (2,3) torus knot
    const p = 2, q = 3, R = 3.2;
    const phi = t * Math.PI * 2 * p;
    const r = R + 1.15 * Math.cos((q / p) * phi);
    return new THREE.Vector3(
      r * Math.cos(phi),
      1.15 * Math.sin((q / p) * phi),
      r * Math.sin(phi)
    );
  };

  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);

  const cBone = new THREE.Color(0xece8df);
  const cAccent = new THREE.Color(0xff4d1f);
  const cDim = new THREE.Color(0x6b4a3a);

  for (let i = 0; i < COUNT; i++) {
    const t = i / COUNT;
    const base = curve.getPoint(t);
    const scatter = 0.16 + Math.pow(Math.random(), 3) * 0.85;
    positions[i * 3] = base.x + (Math.random() - 0.5) * scatter;
    positions[i * 3 + 1] = base.y + (Math.random() - 0.5) * scatter;
    positions[i * 3 + 2] = base.z + (Math.random() - 0.5) * scatter;
    seeds[i] = Math.random();

    const roll = Math.random();
    const c = roll < 0.18 ? cAccent : roll < 0.45 ? cDim : cBone;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: isMobile ? 26.0 : 34.0 },
    },
    vertexShader: `
      attribute float aSeed;
      uniform float uTime;
      uniform float uSize;
      varying vec3 vColor;
      varying float vFade;
      void main() {
        vColor = color;
        vec3 p = position;
        // gentle breathing drift per-particle
        p.x += sin(uTime * 0.6 + aSeed * 31.4) * 0.06;
        p.y += cos(uTime * 0.5 + aSeed * 21.7) * 0.06;
        p.z += sin(uTime * 0.4 + aSeed * 11.3) * 0.06;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float twinkle = 0.65 + 0.35 * sin(uTime * (1.0 + aSeed * 2.0) + aSeed * 50.0);
        vFade = twinkle;
        gl_PointSize = uSize * twinkle * (1.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vFade;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.05, d) * 0.85 * vFade;
        gl_FragColor = vec4(vColor, a);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  points.rotation.x = 0.55;
  scene.add(points);

  // faint wire ring behind, echoes the logo mark
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(4.6, 0.004, 8, 200),
    new THREE.MeshBasicMaterial({ color: 0xff4d1f, transparent: true, opacity: 0.28 })
  );
  ring.rotation.x = Math.PI / 2.3;
  scene.add(ring);

  // --- mouse / scroll reactivity ---
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("pointermove", (e) => {
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  let scrollY = 0;
  window.addEventListener("scroll", () => { scrollY = window.scrollY; }, { passive: true });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  let visible = true;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0 })
    .observe(canvas);

  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const t = clock.getElapsedTime();
    mat.uniforms.uTime.value = t;

    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;

    points.rotation.y = t * 0.08 + mouse.x * 0.25;
    points.rotation.x = 0.55 + mouse.y * 0.18;
    ring.rotation.z = t * 0.05;

    const heroH = window.innerHeight;
    const drift = Math.min(scrollY / heroH, 1);
    camera.position.y = -drift * 2.2;
    camera.position.z = (window.innerWidth < 768 ? 13 : 9.5) + drift * 1.5;
    camera.lookAt(0, -drift * 1.2, 0);

    renderer.render(scene, camera);
  });
}
