// Shared universe data. Kept in one place so components stay small and readable.

export const STAR_FACTS = [
  "The nearest star to Earth (other than the Sun) is Proxima Centauri, 4.24 light-years away.",
  "The Sun makes up about 99.86% of the mass in our solar system.",
  "Stars are born in nebulae — vast clouds of gas and dust.",
  "The largest known star, Stephenson 2-18, has a radius over 2,000 times that of the Sun.",
  "The most massive stars live only a few million years before exploding as supernovae.",
  "Smaller stars, like red dwarfs, can live for trillions of years.",
  "Neutron stars are so dense that a teaspoon of their material would weigh about a billion tons.",
  "A single teaspoon of a white dwarf star would weigh about 5.5 tons.",
  "Some stars, called pulsars, spin hundreds of times per second and emit beams of radiation.",
  "Betelgeuse, a red supergiant, is expected to explode as a supernova sometime in the next 100,000 years.",
  "Most stars in the universe exist in binary or multiple-star systems.",
  "Stars produce energy through nuclear fusion, converting hydrogen into helium.",
  "The Sun converts about 600 million tons of hydrogen into helium every second.",
];

export const MOON_PHASES = [
  {
    name: "New Moon",
    key: "new",
    fact: "The side facing Earth is dark, making it the best time for stargazing.",
  },
  {
    name: "Waxing Crescent",
    key: "wax-cre",
    fact: "\u201CWaxing\u201D means growing — a sliver of light appears days after the new moon.",
  },
  {
    name: "First Quarter",
    key: "first-quar",
    fact: "Half the face is lit. The Moon has completed a quarter of its orbit.",
  },
  {
    name: "Waxing Gibbous",
    key: "wax-gib",
    fact: "More than half is lit as it swells toward full. \u201CGibbous\u201D means humped.",
  },
  {
    name: "Full Moon",
    key: "full-moon",
    fact: "Earth sits between Sun and Moon. The whole face glows — it only reflects sunlight.",
  },
  {
    name: "Waning Gibbous",
    key: "wan-gib",
    fact: "\u201CWaning\u201D means shrinking — light fades after the full moon.",
  },
  {
    name: "Third Quarter",
    key: "third-quar",
    fact: "Also called the last quarter. The Moon is three-quarters through its cycle.",
  },
  {
    name: "Waning Crescent",
    key: "wan-cre",
    fact: "Only a small sliver remains, best seen just before sunrise.",
  },
];

export const DENSITY_OPTIONS = [
  { key: "sparse", label: "sparse", count: 70 },
  { key: "moderate", label: "moderate", count: 140 },
  { key: "crowded", label: "dense", count: 220 },
];
