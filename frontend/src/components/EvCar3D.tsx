import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"; // NEW
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BatteryCharging, Car, Cpu, PlugZap, RotateCw } from "lucide-react";
import { getCarAssets } from "../data/evCarsIndia";

/**
 * NEW: set to true once you have added the 4 generic models
 * (public/models/generic-suv.glb, generic-sedan.glb, generic-hatchback.glb,
 * generic-mpv.glb). Then every car in the dataset shows a real 3D model.
 * While false, cars without their own .glb keep the built-in 3D car.
 */
const USE_GENERIC_MODELS = false;

/** NEW: length (scene units) a loaded model is scaled to. The built-in car is 4.4 long. */
const MODEL_LENGTH = 4.4;

/** NEW: free GPU memory used by a loaded model */
function disposeObject(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    mesh.geometry?.dispose();
    const mat = mesh.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  });
}

/* ============================================================
   VIEW PRESETS
============================================================ */

type ViewKey = "overview" | "battery" | "port" | "motor";

const VIEWS: Record<
  ViewKey,
  {
    label: string;
    icon: typeof Car;
    pos: [number, number, number];
    look: [number, number, number];
  }
> = {
  overview: { label: "Overview", icon: Car, pos: [5.2, 2.2, 5.2], look: [0, 0.7, 0] },
  battery: { label: "Battery", icon: BatteryCharging, pos: [3.2, 0.2, 3.2], look: [0, 0.35, 0] },
  port: { label: "Charge port", icon: PlugZap, pos: [3.6, 1.3, 2.6], look: [1.7, 0.8, 0.9] },
  motor: { label: "Motor", icon: Cpu, pos: [-4.2, 0.9, 2.8], look: [-1.3, 0.5, 0] },
};

function glowColor(percent: number) {
  if (percent >= 50) return 0x22c55e;
  if (percent >= 20) return 0xf59e0b;
  return 0xef4444;
}

/* ============================================================
   COMPONENT
============================================================ */

export default function EvCar3D({
  batteryPercent = 72,
  rangeKm,
  charging = false,
  embedded = false,
  className = "",
  carName, // NEW
}: {
  batteryPercent?: number;
  rangeKm?: number | null;
  charging?: boolean;
  /** true = no outer card, for use inside an existing card */
  embedded?: boolean;
  className?: string;
  /** NEW: the car the user entered, e.g. "Mahindra XEV 9e" */
  carName?: string | null;
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<ViewKey>("overview");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : true,
  );

  // Values the render loop reads without re-creating the scene
  const live = useRef({
    charging,
    percent: batteryPercent,
    dark: isDark,
    goalPos: new THREE.Vector3(...VIEWS.overview.pos),
    goalLook: new THREE.Vector3(...VIEWS.overview.look),
    flying: false,
    controls: null as OrbitControls | null,
    body: null as THREE.MeshStandardMaterial | null,
    glow: null as THREE.MeshStandardMaterial | null,
    port: null as THREE.MeshStandardMaterial | null,
    shadow: null as THREE.MeshBasicMaterial | null,
    key: null as THREE.DirectionalLight | null,
    hemi: null as THREE.HemisphereLight | null,
    scene: null as THREE.Scene | null, // NEW
    car: null as THREE.Group | null, // NEW: the built-in car
  });

  /* ---------- keep refs in sync with props / theme ---------- */

  useEffect(() => {
    live.current.charging = charging;
    live.current.percent = batteryPercent;
    live.current.glow?.color.setHex(glowColor(batteryPercent));
    live.current.glow?.emissive.setHex(glowColor(batteryPercent));
  }, [charging, batteryPercent]);

  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark")),
    );

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const l = live.current;
    l.dark = isDark;
    l.body?.color.set(isDark ? "#d9dee4" : "#2b3440");
    if (l.shadow) l.shadow.opacity = isDark ? 0.55 : 0.28;
    if (l.key) l.key.intensity = isDark ? 1.4 : 2.0;
    if (l.hemi) l.hemi.intensity = isDark ? 0.35 : 0.7;
  }, [isDark]);

  /* ---------- camera presets ---------- */

  const goTo = (next: ViewKey) => {
    const l = live.current;
    setView(next);
    l.goalPos.set(...VIEWS[next].pos);
    l.goalLook.set(...VIEWS[next].look);
    l.flying = true;
    if (l.controls) l.controls.autoRotate = next === "overview";
  };

  /* ---------- build scene once ---------- */

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const l = live.current;
    let frame = 0;
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "pan-y"; // vertical page scroll still works on touch

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    camera.position.set(...VIEWS.overview.pos);

    // Reflections
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // Lights
    l.hemi = new THREE.HemisphereLight(0xffffff, 0x445566, l.dark ? 0.35 : 0.7);
    scene.add(l.hemi);
    l.key = new THREE.DirectionalLight(0xffffff, l.dark ? 1.4 : 2.0);
    l.key.position.set(4, 6, 3);
    scene.add(l.key);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...VIEWS.overview.look);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false; // keeps page scrolling intact
    controls.minDistance = 2;
    controls.maxDistance = 9;
    controls.maxPolarAngle = Math.PI / 2 + 0.15;
    controls.autoRotateSpeed = 1.2;
    controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.addEventListener("start", () => {
      l.flying = false;
      controls.autoRotate = false;
    });
    l.controls = controls;

    /* ----- materials ----- */

    l.body = new THREE.MeshStandardMaterial({
      color: l.dark ? "#d9dee4" : "#2b3440",
      metalness: 0.75,
      roughness: 0.28,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x0b1118,
      metalness: 0.9,
      roughness: 0.08,
    });
    const tire = new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.9 });
    const rim = new THREE.MeshStandardMaterial({ color: 0xaab2bb, metalness: 0.9, roughness: 0.25 });
    const headlight = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xdde8ff,
      emissiveIntensity: 1.6,
    });
    const taillight = new THREE.MeshStandardMaterial({
      color: 0xff2a2a,
      emissive: 0xff1010,
      emissiveIntensity: 1.4,
    });
    l.glow = new THREE.MeshStandardMaterial({
      color: glowColor(l.percent),
      emissive: glowColor(l.percent),
      emissiveIntensity: 1,
      transparent: true,
      opacity: 0.9,
    });
    l.port = new THREE.MeshStandardMaterial({
      color: 0x222831,
      emissive: 0x22c55e,
      emissiveIntensity: 0,
    });

    /* ----- body (extruded side profile) ----- */

    const profile = new THREE.Shape();
    profile.moveTo(-2.2, 0.35);
    profile.lineTo(-2.2, 0.8);
    profile.lineTo(-2.15, 0.95);
    profile.lineTo(-1.3, 1.35);
    profile.lineTo(0.2, 1.45);
    profile.lineTo(0.9, 1.0);
    profile.lineTo(2.1, 0.82);
    profile.lineTo(2.2, 0.6);
    profile.lineTo(2.2, 0.35);
    profile.closePath();

    const bodyGeo = new THREE.ExtrudeGeometry(profile, {
      depth: 1.7,
      bevelEnabled: true,
      bevelSize: 0.06,
      bevelThickness: 0.08,
      bevelSegments: 4,
    });
    bodyGeo.translate(0, 0, -0.85);
    const car = new THREE.Group();
    car.add(new THREE.Mesh(bodyGeo, l.body));

    // Glasshouse (slightly wider than the body so it shows on the sides)
    const greenhouse = new THREE.Shape();
    greenhouse.moveTo(-1.2, 1.0);
    greenhouse.lineTo(-0.95, 1.33);
    greenhouse.lineTo(0.15, 1.4);
    greenhouse.lineTo(0.7, 1.04);
    greenhouse.closePath();
    const glassGeo = new THREE.ExtrudeGeometry(greenhouse, { depth: 1.9, bevelEnabled: false });
    glassGeo.translate(0, 0, -0.95);
    car.add(new THREE.Mesh(glassGeo, glass));

    // Wheels
    const tireGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 32);
    tireGeo.rotateX(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.3, 24);
    rimGeo.rotateX(Math.PI / 2);
    [-1.35, 1.35].forEach((x) =>
      [-0.88, 0.88].forEach((z) => {
        const wheel = new THREE.Group();
        wheel.add(new THREE.Mesh(tireGeo, tire), new THREE.Mesh(rimGeo, rim));
        wheel.position.set(x, 0.38, z);
        car.add(wheel);
      }),
    );

    // Lights
    const lampGeo = new THREE.BoxGeometry(0.06, 0.08, 0.34);
    [-0.58, 0.58].forEach((z) => {
      const lamp = new THREE.Mesh(lampGeo, headlight);
      lamp.position.set(2.22, 0.7, z);
      car.add(lamp);
    });
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 1.5), taillight);
    tail.position.set(-2.22, 0.85, 0);
    car.add(tail);

    // Charge port (front right fender)
    const port = new THREE.Mesh(new THREE.CircleGeometry(0.09, 24), l.port);
    port.position.set(1.65, 0.78, 0.945);
    car.add(port);

    // Battery pack glow under the floor
    const pack = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.05, 1.3), l.glow);
    pack.position.set(0, 0.2, 0);
    car.add(pack);

    scene.add(car);
    l.scene = scene; // NEW
    l.car = car; // NEW

    // Soft ground shadow
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    gradient.addColorStop(0, "rgba(0,0,0,1)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    l.shadow = new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(shadowCanvas),
      transparent: true,
      depthWrite: false,
      opacity: l.dark ? 0.55 : 0.28,
    });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.4), l.shadow);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    scene.add(shadow);

    /* ----- sizing ----- */

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    /* ----- loop ----- */

    const clock = new THREE.Clock();
    let first = true;

    const tick = () => {
      frame = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();

      if (l.flying) {
        camera.position.lerp(l.goalPos, 0.08);
        controls.target.lerp(l.goalLook, 0.08);
        if (camera.position.distanceTo(l.goalPos) < 0.02) l.flying = false;
      }

      // Pulse while charging, steady otherwise
      const pulse = l.charging ? 0.9 + 0.7 * Math.sin(t * 3) : 0.9;
      if (l.glow) l.glow.emissiveIntensity = pulse;
      if (l.port) l.port.emissiveIntensity = l.charging ? 1.2 + 0.8 * Math.sin(t * 3) : 0;

      controls.update();
      renderer.render(scene, camera);

      if (first) {
        first = false;
        setReady(true);
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
      });
      [l.body, glass, tire, rim, headlight, taillight, l.glow, l.port, l.shadow].forEach((m) =>
        m?.dispose(),
      );
      scene.environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      l.controls = null;
      l.scene = null; // NEW
      l.car = null; // NEW
    };
    // Scene is created once; props and theme flow through refs above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- NEW: swap in the real model for the car the user entered ---------- */

  useEffect(() => {
    const l = live.current;
    const scene = l.scene;
    const builtIn = l.car;
    if (!scene || !builtIn) return;

    const assets = getCarAssets(carName ?? "");
    const wantModel = Boolean(carName) && (!assets.isGenericModel || USE_GENERIC_MODELS);

    builtIn.visible = true;
    if (!wantModel) return;

    let cancelled = false;
    let wrapper: THREE.Group | null = null;

    const loader = new GLTFLoader();
    loader.load(
      assets.model,
      (gltf) => {
        if (cancelled || !l.scene) {
          disposeObject(gltf.scene);
          return;
        }

        const model = gltf.scene;

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        model.position.set(-center.x, -box.min.y, -center.z);

        const lengthScale = MODEL_LENGTH / Math.max(size.x, size.z, 0.001);
        wrapper = new THREE.Group();
        wrapper.add(model);
        wrapper.scale.setScalar(lengthScale * assets.scale);
        wrapper.rotation.y = assets.rotationY;

        l.scene.add(wrapper);
        builtIn.visible = false;
      },
      undefined,
      (err) => {
        console.warn(`3D model failed to load: ${assets.model}`, err);
      },
    );

    return () => {
      cancelled = true;
      if (wrapper) {
        l.scene?.remove(wrapper);
        disposeObject(wrapper);
      }
      builtIn.visible = true;
    };
  }, [carName]);

  /* ---------- copy per view ---------- */

  const info: Record<ViewKey, string> = {
    overview: "Drag to rotate the car. Pick a part to look closer.",
    battery: `Battery pack at ${Math.round(batteryPercent)}%${
      rangeKm != null ? ` · about ${Math.round(rangeKm)} km of range` : ""
    }.`,
    port: charging
      ? "Charging now. The port glows while power is flowing."
      : "Charge port. It lights up while the car is charging.",
    motor: "Rear-axle motor drives the car and recovers energy when braking.",
  };

  return (
    <section
      className={`${
        embedded
          ? "overflow-hidden rounded-xl"
          : "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-grid-700/70 dark:bg-grid-850/90 dark:shadow-card"
      } ${className}`}
      aria-label="Interactive 3D view of your EV"
    >
      <div
        className={`relative ${
          embedded ? "h-[250px]" : "h-[320px] sm:h-[380px]"
        } ${embedded ? "bg-slate-50 dark:bg-grid-900/60" : ""}`}
      >
        <div
          ref={mountRef}
          role="img"
          aria-label="3D model of an electric car. Drag to rotate."
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
        />

        {!ready && !failed && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-grid-900"
            role="status"
          >
            <div className="h-20 w-56 animate-pulse rounded-3xl bg-slate-200 motion-reduce:animate-none dark:bg-grid-700/60" />
            <span className="sr-only">Loading 3D view...</span>
          </div>
        )}

        {failed && (
          <div
            role="alert"
            className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-500 dark:text-grid-300"
          >
            3D view isn't available in this browser. Turn on hardware
            acceleration or try another browser.
          </div>
        )}

        {ready && (
          <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-500 backdrop-blur dark:bg-grid-900/70 dark:text-grid-300">
            <RotateCw size={13} />
            Drag to rotate
          </div>
        )}
      </div>

      <div
        className={`${
          embedded ? "pt-4" : "border-t border-slate-200 p-4 dark:border-grid-700/70"
        }`}
      >
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Choose a car part to inspect"
        >
          {(Object.keys(VIEWS) as ViewKey[]).map((key) => {
            const Icon = VIEWS[key].icon;
            const active = view === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => goTo(key)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:focus-visible:ring-volt-400 ${
                  active
                    ? "border-teal-300 bg-teal-50 text-teal-700 dark:border-volt-500/40 dark:bg-volt-500/10 dark:text-volt-300"
                    : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700 dark:border-grid-700 dark:bg-grid-900/60 dark:text-grid-300 dark:hover:border-volt-500/50 dark:hover:text-volt-300"
                }`}
              >
                <Icon size={13} />
                {VIEWS[key].label}
              </button>
            );
          })}
        </div>

        <p
          className="mt-3 text-xs leading-5 text-slate-500 dark:text-grid-400"
          aria-live="polite"
        >
          {info[view]}
        </p>
      </div>
    </section>
  );
}