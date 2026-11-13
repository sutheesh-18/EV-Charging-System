// src/data/evCarsIndia.ts
// Separate dataset of EV cars sold in India, plus lookup + asset-fallback helpers.
//
// HOW IT WORKS
//  - Every car has an `id`. Its files are expected at:
//        public/images/vehicles/<id>.jpg     (2D image)
//        public/models/<id>.glb              (3D model)
//  - When you add a file, add the car's id to IMAGES_AVAILABLE / MODELS_AVAILABLE below.
//  - Cars with no file of their own automatically fall back to a generic image/model
//    for their body type, so every car always shows something in 2D and 3D.
//
// NOTE: The India EV market changes quickly (new launches, discontinued models).
// This list covers well-known models; verify it against the current market and
// add or remove rows as needed.

import { IMAGE_IDS, MODEL_IDS } from "./assetManifest";

export type BodyType = "hatchback" | "sedan" | "suv" | "mpv";

export type EvCar = {
  id: string;
  brand: string;
  name: string;          // display name
  bodyType: BodyType;
  aliases: string[];     // other ways a user might type the name
  color?: string;        // tint for generic fallback models
  scale?: number;        // per-model size fix
  rotationY?: number;    // per-model direction fix (radians)
};

const car = (
  brand: string,
  name: string,
  bodyType: BodyType,
  aliases: string[] = [],
): EvCar => ({
  id: `${brand} ${name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  brand,
  name,
  bodyType,
  aliases,
});

export const EV_CARS_INDIA: EvCar[] = [
  // Tata
  car("Tata", "Tiago EV", "hatchback", ["tiago ev", "tiago electric"]),
  car("Tata", "Punch EV", "suv", ["punch ev", "punch electric"]),
  car("Tata", "Nexon EV", "suv", ["nexon ev", "nexon electric"]),
  car("Tata", "Curvv EV", "suv", ["curvv ev", "curvv electric"]),
  car("Tata", "Harrier EV", "suv", ["harrier ev", "harrier electric"]),

  // Mahindra
  car("Mahindra", "XUV400 EV", "suv", ["xuv400", "xuv 400"]),
  car("Mahindra", "BE 6", "suv", ["be6", "be 6e"]),
  car("Mahindra", "XEV 9e", "suv", ["xev9e", "xev 9e", "mahindra xev9e"]),

  // MG (JSW MG)
  car("MG", "Comet EV", "hatchback", ["comet", "comet ev"]),
  car("MG", "Windsor EV", "suv", ["windsor", "windsor ev"]),
  car("MG", "ZS EV", "suv", ["zs ev", "zs electric"]),

  // Hyundai
  car("Hyundai", "Creta Electric", "suv", ["creta ev", "creta electric"]),
  car("Hyundai", "Ioniq 5", "suv", ["ioniq5"]),

  // Kia
  car("Kia", "EV6", "suv", ["ev 6"]),
  car("Kia", "Syros EV", "suv", ["syros electric"]),

  // Maruti Suzuki / Toyota
  car("Maruti Suzuki", "e Vitara", "suv", ["evitara", "e-vitara"]),
  car("Toyota", "Urban Cruiser Ebella", "suv", ["ebella", "urban cruiser ev"]),

  // Citroen
  car("Citroen", "eC3", "hatchback", ["ec3", "e c3"]),

  // BYD
  car("BYD", "Atto 3", "suv", ["atto3"]),
  car("BYD", "Seal", "sedan", []),
  car("BYD", "eMAX 7", "mpv", ["emax7", "emax 7"]),
  car("BYD", "Sealion 7", "suv", ["sealion7"]),

  // VinFast
  car("VinFast", "VF6", "suv", ["vf 6"]),
  car("VinFast", "VF7", "suv", ["vf 7"]),

  // Premium / luxury
  car("BMW", "iX1", "suv", ["ix1"]),
  car("BMW", "i4", "sedan", []),
  car("BMW", "iX", "suv", []),
  car("Mercedes-Benz", "EQA", "suv", []),
  car("Mercedes-Benz", "EQB", "suv", []),
  car("Mercedes-Benz", "EQS", "sedan", []),
  car("Volvo", "EX40", "suv", ["xc40 recharge", "ex 40"]),
  car("Audi", "Q8 e-tron", "suv", ["q8 etron"]),
  car("Porsche", "Taycan", "sedan", []),
  car("Tesla", "Model Y", "suv", ["modely"]),
];

// ---------------------------------------------------------------------------
// Which cars have their own files. Generated from public/ by "npm run assets".
// ---------------------------------------------------------------------------
export const IMAGES_AVAILABLE = new Set<string>(IMAGE_IDS);
export const MODELS_AVAILABLE = new Set<string>(MODEL_IDS);

// Generic fallbacks, one per body type. Put these 4 files in public/ first.
export const FALLBACK_IMAGES: Record<BodyType, string> = {
  hatchback: "/images/vehicles/generic-hatchback.jpg",
  sedan: "/images/vehicles/generic-sedan.jpg",
  suv: "/images/vehicles/generic-suv.jpg",
  mpv: "/images/vehicles/generic-mpv.jpg",
};

export const FALLBACK_MODELS: Record<BodyType, string> = {
  hatchback: "/models/generic-hatchback.glb",
  sedan: "/models/generic-sedan.glb",
  suv: "/models/generic-suv.glb",
  mpv: "/models/generic-mpv.glb",
};

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Finds a car from whatever the user typed. "Mahindra XEV 9e", "xev9e", "XEV-9E" all match. */
export function findEvCar(input: string): EvCar | undefined {
  const q = normalize(input);
  if (!q) return undefined;

  const keys = (c: EvCar) =>
    [c.name, `${c.brand} ${c.name}`, ...c.aliases, ...c.aliases.map((a) => `${c.brand} ${a}`)].map(normalize);

  // 1) exact match, 2) partial match (longest key wins to avoid "ev6" matching inside longer names)
  const exact = EV_CARS_INDIA.find((c) => keys(c).includes(q));
  if (exact) return exact;

  let best: { car: EvCar; len: number } | undefined;
  for (const c of EV_CARS_INDIA) {
    for (const k of keys(c)) {
      if (k.length >= 3 && (q.includes(k) || k.includes(q))) {
        if (!best || k.length > best.len) best = { car: c, len: k.length };
      }
    }
  }
  return best?.car;
}

/** Suggestions for an autocomplete box while the user types. */
export function searchEvCars(input: string, limit = 8): EvCar[] {
  const q = normalize(input);
  if (!q) return EV_CARS_INDIA.slice(0, limit);
  return EV_CARS_INDIA.filter((c) =>
    [c.name, `${c.brand} ${c.name}`, ...c.aliases].some((k) => normalize(k).includes(q)),
  ).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Assets (always returns something for both 2D and 3D)
// ---------------------------------------------------------------------------
export type CarAssets = {
  car?: EvCar;
  image: string;
  model: string;
  isGenericImage: boolean;
  isGenericModel: boolean;
  scale: number;
  rotationY: number;
  color?: string;
};

export function getCarAssets(input: string | EvCar, defaultBody: BodyType = "suv"): CarAssets {
  const car = typeof input === "string" ? findEvCar(input) : input;
  const body = car?.bodyType ?? defaultBody;

  const hasImage = !!car && IMAGES_AVAILABLE.has(car.id);
  const hasModel = !!car && MODELS_AVAILABLE.has(car.id);

  return {
    car,
    image: hasImage ? `/images/vehicles/${car!.id}.jpg` : FALLBACK_IMAGES[body],
    model: hasModel ? `/models/${car!.id}.glb` : FALLBACK_MODELS[body],
    isGenericImage: !hasImage,
    isGenericModel: !hasModel,
    scale: car?.scale ?? 1,
    rotationY: car?.rotationY ?? 0,
    color: car?.color,
  };
}

/** 2D image URLs to try in order: the car's own photo (if you added it), then the generic one for its body type. */
export function evCarImageSources(car?: EvCar): string[] {
  if (!car) return [];
  const own = IMAGES_AVAILABLE.has(car.id) ? [`/images/vehicles/${car.id}.jpg`] : [];
  return [...own, FALLBACK_IMAGES[car.bodyType]];
}