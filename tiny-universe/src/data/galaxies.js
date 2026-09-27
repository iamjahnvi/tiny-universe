// Chapter map for the descent. Each entry is an environment the camera
// travels through — not a page section. Positions here must stay in sync
// with the scroll layout in Universe.jsx (see SCROLL below).

export const SCROLL = {
  introVh: 100, // empty space before the first environment
  chapterVh: 110, // scroll length devoted to each environment
  outroVh: 140, // empty deep space after the last one
};

export function scrollGeometry() {
  const totalVh = SCROLL.introVh + CHAPTERS.length * SCROLL.chapterVh + SCROLL.outroVh;
  const travelVh = totalVh - 100; // viewport height itself isn't scrollable
  const centerOf = (i) => (SCROLL.introVh + (i + 0.5) * SCROLL.chapterVh) / travelVh;
  return { totalVh, travelVh, centerOf };
}

export const CHAPTERS = [
  {
    id: "01",
    name: "Stellar Field",
    sub: "where the descent begins",
    type: "stars",
    anchor: { x: 0.5, y: 0.46 },
  },
  {
    id: "02",
    name: "Spiral",
    sub: "a rotating island of stars",
    type: "spiral",
    anchor: { x: 0.5, y: 0.48 },
    tint: [150, 170, 220],
    warm: [230, 190, 150],
  },
  {
    id: "03",
    name: "Nebula",
    sub: "gas · dust · new suns",
    type: "nebula",
    anchor: { x: 0.5, y: 0.5 },
    hues: [210, 280, 320, 20],
  },
  {
    id: "04",
    name: "Collision",
    sub: "two systems · one gravity",
    type: "collision",
    anchor: { x: 0.5, y: 0.48 },
  },
  {
    id: "05",
    name: "Pillars",
    sub: "dust towers in starlight",
    type: "pillars",
    anchor: { x: 0.5, y: 0.52 },
  },
  {
    id: "06",
    name: "Deep Field",
    sub: "every point · a galaxy",
    type: "deepfield",
    anchor: { x: 0.5, y: 0.5 },
  },
  {
    id: "07",
    name: "Quasar",
    sub: "a beacon at the edge",
    type: "quasar",
    anchor: { x: 0.5, y: 0.46 },
  },
  {
    id: "08",
    name: "Unknown",
    sub: "no further data",
    type: "unknown",
    anchor: { x: 0.5, y: 0.5 },
  },
];
