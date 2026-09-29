// ─────────────────────────────────────────────────────────────
// Tiny Universe · destination model — worlds, not pictures.
//
// Each object is art-directed as a cosmic ENVIRONMENT. The source image
// is raw material: the renderer crops around focalPoint, feathers every
// edge into atmosphere, and places the body inside depth. No destination
// is ever rendered as a rectangle.
//
// Fields:
//   form            spiral | collision | pillars | veil | swarm |
//                   remnant | deepfield | nebula — distinct composition.
//   focalPoint      {x,y} 0..1 — subject inside the SOURCE that survives.
//   focalMobile     {x,y} — override for narrow screens.
//   scale           art-directed zoom into the plate.
//   infoSide        left|right — editorial float side, never over subject.
//   rotation        slow angular drift (rad/s scale), 0 = still.
//   depth           0..1 — how enveloping the environment is.
//   envelope        true — camera enters the medium (nebulae / veil).
//   atmosphere      {primary, secondary, glow, particle}
//   visual          {focalPoint, scale, position, atmosphere, accentColor,
//                    depth, rotation} — mirrors above for clean consumers.
// ─────────────────────────────────────────────────────────────

export const SCROLL = {
  // A true descent: long approach, long dwell, real transition voids
  // between worlds. Each reign is ~5 viewports of travel.
  introVh: 170,
  chapterVh: 520,
  outroVh: 240,
};

export function scrollGeometry() {
  const totalVh =
    SCROLL.introVh + CHAPTERS.length * SCROLL.chapterVh + SCROLL.outroVh;
  const travelVh = totalVh - 100;
  const centerOf = (i) =>
    (SCROLL.introVh + (i + 0.5) * SCROLL.chapterVh) / travelVh;
  return { totalVh, travelVh, centerOf };
}

const withVisual = (ch) => ({
  ...ch,
  visual: {
    focalPoint: ch.focalPoint,
    scale: ch.scale,
    position: ch.infoSide,
    atmosphere: ch.atmosphere,
    accentColor: ch.accent,
    depth: ch.depth,
    rotation: ch.rotation,
  },
});

const RAW = [
  {
    id: "01",
    slug: "pillars-of-creation",
    name: "Pillars of Creation",
    designation: "M16 · EAGLE NEBULA",
    category: "STAR-FORMING NEBULA",
    object: "Eagle Nebula · M16",
    sub: "towers of gas and dark dust",
    teaser: "Cold towers of gas where young stars ignite.",
    invitation: "ENTER THE NURSERY",
    image: "/hubble/pillars.jpg",
    description:
      "Towering columns of cold gas and dark dust, sculpted by the winds of newborn stars. The tallest finger stretches light-years — a stellar nursery caught mid-creation.",
    distance: "7,000 light-years",
    structure: "Star-forming pillars",
    region: "Serpens",
    location: "Eagle Nebula · Serpens",
    type: "Emission nebula",
    telescope: "Hubble Space Telescope",
    year: "1995 · 2014 revisit",
    credit: "NASA, ESA & Hubble Heritage",
    source: "NASA Image Library · PIA03096",
    // ── composition: TOWERS — camera descends past massive vertical
    // structures. Enveloping: the plate is drawn huge, surrounding view.
    form: "pillars",
    focalPoint: { x: 0.46, y: 0.42 },
    focalMobile: { x: 0.5, y: 0.36 },
    scale: 1.35,
    infoSide: "right",
    rotation: 0,
    depth: 0.95,
    envelope: true,
    atmosphere: {
      primary: [232, 150, 90],
      secondary: [140, 90, 200],
      glow: [255, 170, 110],
      particle: [255, 190, 150],
    },
    accent: [232, 150, 90],
    fog: [120, 70, 50],
    zone: { bg: [9, 7, 14], wash: [235, 150, 95] },
  },
  {
    id: "02",
    slug: "rose-of-galaxies",
    name: "A Rose of Galaxies",
    designation: "ARP 273 · UGC 1810/1813",
    category: "INTERACTING GALAXIES",
    object: "Arp 273",
    sub: "two galaxies in embrace",
    teaser: "Gravity sculpting a tidal tail into a rose.",
    invitation: "APPROACH THE ROSE",
    image: "/hubble/rose.jpg",
    description:
      "Two galaxies locked in gravitational embrace. The larger ring galaxy drags a plume of stars from its companion — a rose drawn in tidal starlight.",
    distance: "~300M light-years",
    structure: "Interacting pair + tidal tail",
    region: "Andromeda",
    location: "Arp 273 · Andromeda",
    type: "Interacting galaxies",
    telescope: "Hubble Space Telescope",
    year: "2011",
    credit: "NASA / ESA Hubble",
    source: "NASA Image Library · Arp 273",
    // ── composition: SPIRAL WORLD — huge rotating structure, circular
    // feathered body, orbital particles, radial core glow.
    form: "spiral",
    focalPoint: { x: 0.62, y: 0.38 },
    focalMobile: { x: 0.58, y: 0.4 },
    scale: 1.3,
    infoSide: "right",
    rotation: 0.05,
    depth: 0.45,
    envelope: false,
    atmosphere: {
      primary: [190, 130, 220],
      secondary: [90, 160, 230],
      glow: [200, 150, 255],
      particle: [200, 170, 255],
    },
    accent: [190, 130, 220],
    fog: [110, 75, 160],
    zone: { bg: [10, 6, 24], wash: [165, 125, 235] },
  },
  {
    id: "03",
    slug: "ngc-3603",
    name: "NGC 3603",
    designation: "NGC 3603 · STARBURST",
    category: "YOUNG STAR CLUSTER",
    object: "Starburst Cluster",
    sub: "a cluster bursting into life",
    teaser: "Thousands of young suns burning blue.",
    invitation: "ENTER THE SWARM",
    image: "/hubble/ngc3603.jpg",
    description:
      "A compact furnace of thousands of young, massive stars. Their ultraviolet fire carves the surrounding cloud into glowing blue and cyan ramparts.",
    distance: "~20,000 light-years",
    structure: "Young massive cluster",
    region: "Carina",
    location: "NGC 3603 · Carina arm",
    type: "Starburst cluster",
    telescope: "Hubble Space Telescope",
    year: "Hubble archive",
    credit: "NASA / ESA Hubble",
    source: "NASA Image Library",
    // ── composition: SWARM — dense spherical formation surrounding the
    // camera. Small bright core + hundreds of orbiting points.
    form: "swarm",
    focalPoint: { x: 0.5, y: 0.46 },
    focalMobile: { x: 0.5, y: 0.42 },
    scale: 1.18,
    infoSide: "left",
    rotation: 0.02,
    depth: 0.8,
    envelope: false,
    atmosphere: {
      primary: [120, 200, 240],
      secondary: [90, 120, 255],
      glow: [150, 220, 255],
      particle: [150, 210, 255],
    },
    accent: [120, 200, 240],
    fog: [60, 120, 180],
    zone: { bg: [3, 10, 22], wash: [95, 175, 245] },
  },
  {
    id: "04",
    slug: "antennae-galaxies",
    name: "Antennae Galaxies",
    designation: "NGC 4038 + NGC 4039",
    category: "COLLIDING GALAXIES",
    object: "NGC 4038 · NGC 4039",
    sub: "two systems · one gravity",
    teaser: "Two galaxies mid-collision, flinging newborn stars.",
    invitation: "WITNESS THE COLLISION",
    image: "/hubble/antennae.jpg",
    description:
      "Two spiral galaxies caught in collision, flinging tidal tails hundreds of thousands of light-years long. Blue knots along the tails are firestorms of new stars.",
    distance: "~60M light-years",
    structure: "Colliding pair + tidal tails",
    region: "Corvus",
    location: "NGC 4038/39 · Corvus",
    type: "Interacting galaxies",
    telescope: "Hubble Space Telescope",
    year: "Hubble archive",
    credit: "NASA / JPL",
    source: "NASA Image Library · PIA04205",
    // ── composition: COLLISION — wide luminous churn, slow rotation,
    // dual-core glow, debris particles flung outward.
    form: "collision",
    focalPoint: { x: 0.44, y: 0.5 },
    focalMobile: { x: 0.5, y: 0.48 },
    scale: 1.28,
    infoSide: "right",
    rotation: -0.035,
    depth: 0.55,
    envelope: false,
    atmosphere: {
      primary: [230, 110, 140],
      secondary: [120, 110, 255],
      glow: [255, 130, 170],
      particle: [255, 150, 190],
    },
    accent: [230, 110, 140],
    fog: [170, 65, 100],
    zone: { bg: [16, 6, 22], wash: [240, 120, 175] },
  },
  {
    id: "05",
    slug: "horsehead-nebula",
    name: "Horsehead Nebula",
    designation: "BARNARD 33 · IC 434",
    category: "DARK NEBULA",
    object: "Barnard 33",
    sub: "a silhouette in ember light",
    teaser: "A dark silhouette rising before ember hydrogen.",
    invitation: "DRIFT INTO THE DARK",
    image: "/hubble/horsehead.jpg",
    description:
      "A dense tongue of dust rising before the glowing hydrogen of IC 434. Backlit in deep red, the horsehead is a shadow the size of a stellar nursery.",
    distance: "~1,500 light-years",
    structure: "Dark cloud + emission wall",
    region: "Orion",
    location: "Orion's Belt · IC 434",
    type: "Dark nebula",
    telescope: "Hubble Space Telescope",
    year: "2013",
    credit: "NASA / ESA Hubble",
    source: "NASA Image Library · PIA04215",
    // ── composition: VEIL — a massive dark wall towering above/below.
    // Camera passes alongside it; ember field surrounds.
    form: "veil",
    focalPoint: { x: 0.42, y: 0.44 },
    focalMobile: { x: 0.5, y: 0.4 },
    scale: 1.4,
    infoSide: "right",
    rotation: 0,
    depth: 0.9,
    envelope: true,
    atmosphere: {
      primary: [220, 110, 70],
      secondary: [180, 60, 60],
      glow: [255, 130, 80],
      particle: [255, 160, 110],
    },
    accent: [220, 110, 70],
    fog: [150, 60, 40],
    zone: { bg: [18, 7, 6], wash: [250, 125, 80] },
  },
  {
    id: "06",
    slug: "crab-nebula",
    name: "Crab Nebula",
    designation: "M1 · TAURUS A",
    category: "SUPERNOVA REMNANT",
    object: "M1 · Taurus A",
    sub: "the remains of a star",
    teaser: "A supernova's expanding heart, still racing outward.",
    invitation: "ENTER THE REMNANT",
    image: "/hubble/crab.jpg",
    description:
      "The expanding remnant of a star seen to explode in 1054. Filaments of shattered gas still race outward, lit from within by a spinning pulsar's wind.",
    distance: "~6,500 light-years",
    structure: "Pulsar wind nebula",
    region: "Taurus",
    location: "M1 · Taurus",
    type: "Supernova remnant",
    telescope: "Hubble Space Telescope",
    year: "2005",
    credit: "NASA / ESA Hubble",
    source: "NASA Image Library · PIA03606",
    // ── composition: REMNANT — wispy expanding shell, breathing glow,
    // filaments drifting outward from a hot heart.
    form: "remnant",
    focalPoint: { x: 0.5, y: 0.5 },
    focalMobile: { x: 0.5, y: 0.48 },
    scale: 1.26,
    infoSide: "left",
    rotation: 0.015,
    depth: 0.65,
    envelope: false,
    atmosphere: {
      primary: [240, 120, 80],
      secondary: [200, 70, 120],
      glow: [255, 150, 100],
      particle: [255, 170, 130],
    },
    accent: [240, 120, 80],
    fog: [190, 75, 50],
    zone: { bg: [19, 6, 9], wash: [255, 130, 90] },
  },
  {
    id: "07",
    slug: "ultra-deep-field",
    name: "Ultra Deep Field",
    designation: "HUDF · DEEP SURVEY",
    category: "DEEP GALAXY FIELD",
    object: "Hubble Deep Survey",
    sub: "every point · a galaxy",
    teaser: "Nearly 10,000 galaxies in a stare into the dark.",
    invitation: "FALL THROUGH DEEP TIME",
    image: "/hubble/deepfield.jpg",
    description:
      "A long stare into near-nothingness that revealed nearly 10,000 galaxies — some seen as they were 13 billion years ago. Every speck of light is an island universe.",
    distance: "Up to ~13B light-years",
    structure: "Deep visible-light field",
    region: "Fornax",
    location: "HUDF · Fornax",
    type: "Deep field",
    telescope: "Hubble Space Telescope",
    year: "2004–2013",
    credit: "NASA / ESA Hubble",
    source: "NASA Image Library",
    // ── composition: DEEP FIELD — no single body. Thousands of distant
    // galaxies distributed through enormous depth; the plate becomes a
    // vast faint expanse + procedural depth grain.
    form: "deepfield",
    focalPoint: { x: 0.5, y: 0.5 },
    focalMobile: { x: 0.5, y: 0.5 },
    scale: 1.5,
    infoSide: "right",
    rotation: 0,
    depth: 1.0,
    envelope: true,
    atmosphere: {
      primary: [200, 200, 210],
      secondary: [140, 150, 190],
      glow: [230, 230, 245],
      particle: [220, 220, 235],
    },
    accent: [200, 200, 210],
    fog: [105, 105, 120],
    zone: { bg: [4, 4, 6], wash: [175, 175, 195] },
  },
  {
    id: "08",
    slug: "carina-nebula",
    name: "Carina Nebula",
    designation: "NGC 3372 · ETA CARINAE",
    category: "STELLAR NURSERY",
    object: "NGC 3372",
    sub: "where giants are born",
    teaser: "Pillars and giants in teal and gold.",
    invitation: "BE SWALLOWED BY LIGHT",
    image: "/hubble/carina.jpg",
    description:
      "A vast nursery of pillars and evaporating globules, home to some of the most massive stars known. The finale burns luminous — teal gas, gold dust, white fire.",
    distance: "~8,500 light-years",
    structure: "Pillars + globules",
    region: "Carina",
    location: "NGC 3372 · Carina",
    type: "Emission nebula",
    telescope: "Hubble Space Telescope",
    year: "Hubble archive",
    credit: "NASA / ESA Hubble",
    source: "NASA Image Library",
    // ── composition: NEBULA — a huge cloud surrounding the camera.
    // The user enters it; brightest region glows above.
    form: "nebula",
    focalPoint: { x: 0.52, y: 0.4 },
    focalMobile: { x: 0.5, y: 0.38 },
    scale: 1.45,
    infoSide: "left",
    rotation: 0,
    depth: 1.0,
    envelope: true,
    atmosphere: {
      primary: [240, 180, 110],
      secondary: [90, 200, 190],
      glow: [255, 210, 150],
      particle: [200, 230, 210],
    },
    accent: [240, 180, 110],
    fog: [90, 140, 130],
    zone: { bg: [7, 11, 8], wash: [210, 190, 150] },
  },
];

export const CHAPTERS = RAW.map(withVisual);
