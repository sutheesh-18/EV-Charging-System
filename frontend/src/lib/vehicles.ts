/**
 * VoltGrid vehicle catalog + name matcher.
 *
 * Type "byd"          -> BYD (default model)
 * Type "tata nexon"   -> Tata Nexon EV
 * Type "nexon.ev"     -> Tata Nexon EV
 * Type "byd atto 3"   -> BYD Atto 3
 * Type "tata altroz"  -> no match (we never show the WRONG car)
 *
 * To support another car, add one entry to VEHICLES below and put its image at
 *   public/images/vehicles/<id>.png
 */

export type Vehicle = {
  /** file name of the local image: /images/vehicles/<id>.png */
  id: string;
  make: string;
  model: string;
  /** names people might type for this car (lower case) */
  aliases: string[];
  /** optional mapping for the Imagin.studio image API (see vehicleImageSources) */
  imagin?: { make: string; modelFamily: string };
};

export const VEHICLES: Vehicle[] = [
  /* ---------- Tata ---------- */
  { id: "tata-nexon-ev", make: "tata", model: "Nexon EV", aliases: ["nexon", "nexon ev", "nexon.ev"], imagin: { make: "tata", modelFamily: "nexon" } },
  { id: "tata-tiago-ev", make: "tata", model: "Tiago EV", aliases: ["tiago", "tiago ev"], imagin: { make: "tata", modelFamily: "tiago" } },
  { id: "tata-punch-ev", make: "tata", model: "Punch EV", aliases: ["punch", "punch ev"], imagin: { make: "tata", modelFamily: "punch" } },
  { id: "tata-tigor-ev", make: "tata", model: "Tigor EV", aliases: ["tigor", "tigor ev"], imagin: { make: "tata", modelFamily: "tigor" } },
  { id: "tata-curvv-ev", make: "tata", model: "Curvv EV", aliases: ["curvv", "curvv ev", "curv"], imagin: { make: "tata", modelFamily: "curvv" } },
  { id: "tata-harrier-ev", make: "tata", model: "Harrier EV", aliases: ["harrier", "harrier ev"], imagin: { make: "tata", modelFamily: "harrier" } },

  /* ---------- MG ---------- */
  { id: "mg-zs-ev", make: "mg", model: "ZS EV", aliases: ["zs", "zs ev"], imagin: { make: "mg", modelFamily: "zs" } },
  { id: "mg-comet-ev", make: "mg", model: "Comet EV", aliases: ["comet", "comet ev"], imagin: { make: "mg", modelFamily: "comet" } },
  { id: "mg-windsor-ev", make: "mg", model: "Windsor EV", aliases: ["windsor", "windsor ev"], imagin: { make: "mg", modelFamily: "windsor" } },

  /* ---------- Mahindra ---------- */
  { id: "mahindra-xuv400", make: "mahindra", model: "XUV400", aliases: ["xuv400", "xuv 400", "xuv400 ev"], imagin: { make: "mahindra", modelFamily: "xuv400" } },
  { id: "mahindra-be-6", make: "mahindra", model: "BE 6", aliases: ["be 6", "be6", "be 6e"], imagin: { make: "mahindra", modelFamily: "be-6" } },
  { id: "mahindra-xev-9e", make: "mahindra", model: "XEV 9e", aliases: ["xev 9e", "xev9e", "xev 9"], imagin: { make: "mahindra", modelFamily: "xev-9e" } },

  /* ---------- BYD ---------- */
  { id: "byd-atto-3", make: "byd", model: "Atto 3", aliases: ["atto 3", "atto3", "atto"], imagin: { make: "byd", modelFamily: "atto-3" } },
  { id: "byd-seal", make: "byd", model: "Seal", aliases: ["seal"], imagin: { make: "byd", modelFamily: "seal" } },
  { id: "byd-sealion-7", make: "byd", model: "Sealion 7", aliases: ["sealion 7", "sealion7", "sealion"], imagin: { make: "byd", modelFamily: "sealion-7" } },
  { id: "byd-emax-7", make: "byd", model: "eMAX 7", aliases: ["emax 7", "emax7", "emax", "e6"], imagin: { make: "byd", modelFamily: "emax-7" } },
  { id: "byd-dolphin", make: "byd", model: "Dolphin", aliases: ["dolphin"], imagin: { make: "byd", modelFamily: "dolphin" } },

  /* ---------- Hyundai / Kia ---------- */
  { id: "hyundai-ioniq-5", make: "hyundai", model: "Ioniq 5", aliases: ["ioniq 5", "ioniq5", "ioniq"], imagin: { make: "hyundai", modelFamily: "ioniq-5" } },
  { id: "hyundai-kona-electric", make: "hyundai", model: "Kona Electric", aliases: ["kona", "kona electric"], imagin: { make: "hyundai", modelFamily: "kona" } },
  { id: "hyundai-creta-electric", make: "hyundai", model: "Creta Electric", aliases: ["creta", "creta electric"], imagin: { make: "hyundai", modelFamily: "creta" } },
  { id: "kia-ev6", make: "kia", model: "EV6", aliases: ["ev6", "ev 6"], imagin: { make: "kia", modelFamily: "ev6" } },
  { id: "kia-ev9", make: "kia", model: "EV9", aliases: ["ev9", "ev 9"], imagin: { make: "kia", modelFamily: "ev9" } },

  /* ---------- Citroen ---------- */
  { id: "citroen-ec3", make: "citroen", model: "eC3", aliases: ["ec3", "e c3"], imagin: { make: "citroen", modelFamily: "c3" } },

  /* ---------- Tesla ---------- */
  { id: "tesla-model-3", make: "tesla", model: "Model 3", aliases: ["model 3", "model3"], imagin: { make: "tesla", modelFamily: "model-3" } },
  { id: "tesla-model-y", make: "tesla", model: "Model Y", aliases: ["model y", "modely"], imagin: { make: "tesla", modelFamily: "model-y" } },
  { id: "tesla-model-s", make: "tesla", model: "Model S", aliases: ["model s", "models"], imagin: { make: "tesla", modelFamily: "model-s" } },
  { id: "tesla-model-x", make: "tesla", model: "Model X", aliases: ["model x", "modelx"], imagin: { make: "tesla", modelFamily: "model-x" } },

  /* ---------- Others ---------- */
  { id: "nissan-leaf", make: "nissan", model: "Leaf", aliases: ["leaf"], imagin: { make: "nissan", modelFamily: "leaf" } },
  { id: "bmw-ix1", make: "bmw", model: "iX1", aliases: ["ix1"], imagin: { make: "bmw", modelFamily: "ix1" } },
  { id: "bmw-i4", make: "bmw", model: "i4", aliases: ["i4"], imagin: { make: "bmw", modelFamily: "i4" } },
  { id: "bmw-ix", make: "bmw", model: "iX", aliases: ["ix"], imagin: { make: "bmw", modelFamily: "ix" } },
  { id: "mercedes-eqs", make: "mercedes", model: "EQS", aliases: ["eqs"], imagin: { make: "mercedes-benz", modelFamily: "eqs" } },
  { id: "mercedes-eqb", make: "mercedes", model: "EQB", aliases: ["eqb"], imagin: { make: "mercedes-benz", modelFamily: "eqb" } },
  { id: "volvo-ex40", make: "volvo", model: "EX40", aliases: ["ex40", "xc40 recharge", "xc40"], imagin: { make: "volvo", modelFamily: "ex40" } },
  { id: "porsche-taycan", make: "porsche", model: "Taycan", aliases: ["taycan"], imagin: { make: "porsche", modelFamily: "taycan" } },
  { id: "audi-q8-e-tron", make: "audi", model: "Q8 e-tron", aliases: ["q8 e tron", "q8 etron", "e tron", "etron"], imagin: { make: "audi", modelFamily: "q8-e-tron" } },
];

/** Names people use for a brand -> canonical make */
const MAKE_NAMES: Record<string, string[]> = {
  tata: ["tata", "tata motors"],
  mg: ["mg", "mg motor", "morris garages"],
  mahindra: ["mahindra"],
  byd: ["byd", "build your dreams"],
  hyundai: ["hyundai"],
  kia: ["kia"],
  citroen: ["citroen", "citroën"],
  tesla: ["tesla"],
  nissan: ["nissan"],
  bmw: ["bmw"],
  mercedes: ["mercedes", "mercedes benz", "benz"],
  volvo: ["volvo"],
  porsche: ["porsche"],
  audi: ["audi"],
};

/** The car shown when only the brand is typed (e.g. just "byd") */
const BRAND_DEFAULT: Record<string, string> = {
  tata: "tata-nexon-ev",
  mg: "mg-zs-ev",
  mahindra: "mahindra-xuv400",
  byd: "byd-atto-3",
  hyundai: "hyundai-ioniq-5",
  kia: "kia-ev6",
  citroen: "citroen-ec3",
  tesla: "tesla-model-3",
  nissan: "nissan-leaf",
  bmw: "bmw-ix1",
  mercedes: "mercedes-eqs",
  volvo: "volvo-ex40",
  porsche: "porsche-taycan",
  audi: "audi-q8-e-tron",
};

/** Words that do not identify a model */
const GENERIC_WORDS = new Set([
  "ev", "electric", "car", "cars", "motors", "motor", "the", "my", "new",
  "pro", "plus", "max", "lr", "mr", "long", "range", "dark", "edition",
]);

/* ============================================================
   MATCHER
============================================================ */

export type VehicleMatch = {
  vehicle: Vehicle;
  /** "model" = the model was recognised, "brand" = only the brand was typed */
  kind: "model" | "brand";
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const compact = (text: string) => text.replace(/ /g, "");

function withinOneEdit(a: string, b: string) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

export function matchVehicle(input?: string | null): VehicleMatch | null {
  if (!input) return null;

  const text = normalize(input);
  if (!text) return null;

  const padded = ` ${text} `;
  const squashed = compact(text);
  const tokens = text.split(" ");

  /* 1) a specific model was typed */
  let best: { vehicle: Vehicle; score: number } | null = null;

  for (const vehicle of VEHICLES) {
    for (const rawAlias of vehicle.aliases) {
      const alias = normalize(rawAlias);
      if (!alias) continue;

      const aliasWords = alias.split(" ").length;
      let hit = padded.includes(` ${alias} `);

      // "atto3", "model3", "nexonev" (no spaces) - only for longer aliases
      if (!hit && compact(alias).length >= 5) {
        hit = squashed.includes(compact(alias));
      }

      // small typos: "nexxon" -> "nexon" (single-word aliases, 5+ letters)
      if (!hit && aliasWords === 1 && alias.length >= 5) {
        hit = tokens.some((token) => token.length >= 5 && withinOneEdit(token, alias));
      }

      if (!hit) continue;

      const score = aliasWords * 10 + alias.length;
      if (!best || score > best.score) best = { vehicle, score };
    }
  }

  if (best) return { vehicle: best.vehicle, kind: "model" };

  /* 2) only a brand was typed ("byd", "tata motors") */
  for (const [make, names] of Object.entries(MAKE_NAMES)) {
    const matchedName = names
      .map(normalize)
      .filter((name) => padded.includes(` ${name} `))
      .sort((a, b) => b.length - a.length)[0];

    if (!matchedName) continue;

    // anything left that is not a generic word means a model we do not know:
    // better to show no photo than the wrong car
    const rest = text
      .replace(matchedName, " ")
      .split(" ")
      .filter((word) => word && !GENERIC_WORDS.has(word));

    if (rest.length === 0) {
      const vehicle = VEHICLES.find((v) => v.id === BRAND_DEFAULT[make]);
      if (vehicle) return { vehicle, kind: "brand" };
    }
    return null;
  }

  return null;
}


/**
 * Try several texts in order (e.g. "Tata Punch EV", then the nickname the
 * driver gave the car) and return the first car that is recognised.
 */
export function matchVehicleAny(
  candidates: (string | null | undefined)[],
): VehicleMatch | null {
  for (const candidate of candidates) {
    const match = matchVehicle(candidate);
    if (match) return match;
  }
  return null;
}

const MAKE_LABELS: Record<string, string> = {
  tata: "Tata",
  mg: "MG",
  mahindra: "Mahindra",
  byd: "BYD",
  hyundai: "Hyundai",
  kia: "Kia",
  citroen: "Citroën",
  tesla: "Tesla",
  nissan: "Nissan",
  bmw: "BMW",
  mercedes: "Mercedes-Benz",
  volvo: "Volvo",
  porsche: "Porsche",
  audi: "Audi",
};

/** Brand names for the "Manufacturer" suggestions */
export function vehicleMakes(): string[] {
  return Object.values(MAKE_LABELS);
}

/** Model names for the "Model" suggestions, once a brand has been typed */
export function modelsForMake(input?: string | null): string[] {
  const text = normalize(input ?? "");
  if (!text) return [];

  const padded = ` ${text} `;
  const make = Object.entries(MAKE_NAMES).find(([, names]) =>
    names.map(normalize).some((name) => padded.includes(` ${name} `)),
  )?.[0];

  return make
    ? VEHICLES.filter((vehicle) => vehicle.make === make).map(
        (vehicle) => vehicle.model,
      )
    : [];
}

export function vehicleLabel(vehicle: Vehicle) {
  const make: Record<string, string> = {
    mg: "MG",
    byd: "BYD",
    bmw: "BMW",
    mercedes: "Mercedes-Benz",
    citroen: "Citroën",
  };
  const name = make[vehicle.make] ?? vehicle.make.charAt(0).toUpperCase() + vehicle.make.slice(1);
  return `${name} ${vehicle.model}`;
}

/* ============================================================
   IMAGE SOURCES
============================================================ */

type EnvShape = { env?: Record<string, string | undefined> };

/**
 * Ordered list of places to try for a car image:
 *  1. your own file   public/images/vehicles/<id>.png (.webp / .jpg also work)
 *  2. Imagin.studio   only if VITE_IMAGIN_CUSTOMER_KEY is set in .env
 */
export function vehicleImageSources(
  vehicle: Vehicle,
  options: { angle?: string; width?: number } = {},
): string[] {
  // .png first, then other common formats, so a .jpg / .webp file also works
  const sources = ["png", "webp", "jpg", "jpeg"].map(
    (extension) => `/images/vehicles/${vehicle.id}.${extension}`,
  );

  const key = (import.meta as unknown as EnvShape).env?.VITE_IMAGIN_CUSTOMER_KEY;

  if (key && vehicle.imagin) {
    const params = new URLSearchParams({
      customer: key,
      make: vehicle.imagin.make,
      modelFamily: vehicle.imagin.modelFamily,
      zoomType: "fullscreen",
      fileType: "png",
      width: String(options.width ?? 800),
    });
    if (options.angle) params.set("angle", options.angle);
    sources.push(`https://cdn.imagin.studio/getImage?${params.toString()}`);
  }

  return sources;
}