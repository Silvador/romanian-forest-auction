import { TreeDeciduous, TreePine, Trees } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SpeciesVisual {
  icon: LucideIcon;
  gradient: string;
  accent: string;
  description: string;
}

// Species visual configuration for placeholder images
export const speciesVisuals: Record<string, SpeciesVisual> = {
  // Oak species - Rich browns and ambers
  "Stejar pedunculat": {
    icon: TreeDeciduous,
    gradient: "from-amber-600 via-orange-700 to-amber-800",
    accent: "#d97706",
    description: "Pedunculate Oak"
  },
  "Stejar brumăriu": {
    icon: TreeDeciduous,
    gradient: "from-amber-700 via-yellow-800 to-amber-900",
    accent: "#b45309",
    description: "Sessile Oak"
  },
  "Gorun": {
    icon: TreeDeciduous,
    gradient: "from-orange-700 via-amber-800 to-orange-900",
    accent: "#c2410c",
    description: "Durmast Oak"
  },
  "Cer": {
    icon: TreeDeciduous,
    gradient: "from-yellow-700 via-amber-700 to-yellow-800",
    accent: "#a16207",
    description: "Turkey Oak"
  },

  // Beech - Cool greens and silvers
  "Fag": {
    icon: TreeDeciduous,
    gradient: "from-emerald-600 via-teal-700 to-emerald-800",
    accent: "#059669",
    description: "European Beech"
  },

  // Hornbeam and Ash - Olive greens
  "Carpen": {
    icon: TreeDeciduous,
    gradient: "from-lime-700 via-green-800 to-lime-900",
    accent: "#4d7c0f",
    description: "Hornbeam"
  },
  "Frasin": {
    icon: TreeDeciduous,
    gradient: "from-green-700 via-emerald-800 to-green-900",
    accent: "#15803d",
    description: "European Ash"
  },

  // Maple species - Bright greens and yellows
  "Jugastru": {
    icon: TreeDeciduous,
    gradient: "from-lime-600 via-yellow-700 to-lime-800",
    accent: "#65a30d",
    description: "Field Maple"
  },
  "Paltin de câmp": {
    icon: TreeDeciduous,
    gradient: "from-yellow-600 via-lime-700 to-yellow-800",
    accent: "#ca8a04",
    description: "Field Maple"
  },
  "Paltin de munte": {
    icon: TreeDeciduous,
    gradient: "from-green-600 via-lime-700 to-green-800",
    accent: "#16a34a",
    description: "Sycamore"
  },

  // Linden - Soft greens
  "Tei argintiu": {
    icon: TreeDeciduous,
    gradient: "from-teal-600 via-cyan-700 to-teal-800",
    accent: "#0d9488",
    description: "Silver Linden"
  },
  "Tei cu frunze mari": {
    icon: TreeDeciduous,
    gradient: "from-cyan-600 via-teal-700 to-cyan-800",
    accent: "#0891b2",
    description: "Large-leaved Linden"
  },

  // Elm - Deep greens
  "Ulm de câmp": {
    icon: TreeDeciduous,
    gradient: "from-green-700 via-emerald-800 to-green-900",
    accent: "#166534",
    description: "Field Elm"
  },
  "Ulm de munte": {
    icon: TreeDeciduous,
    gradient: "from-emerald-700 via-green-800 to-emerald-900",
    accent: "#047857",
    description: "Mountain Elm"
  },

  // Alder and Birch - Light greens and whites
  "Anin alb": {
    icon: TreeDeciduous,
    gradient: "from-slate-500 via-green-600 to-slate-700",
    accent: "#64748b",
    description: "Grey Alder"
  },
  "Anin negru": {
    icon: TreeDeciduous,
    gradient: "from-slate-700 via-green-800 to-slate-900",
    accent: "#475569",
    description: "Black Alder"
  },
  "Mesteacăn": {
    icon: TreeDeciduous,
    gradient: "from-gray-400 via-slate-500 to-gray-600",
    accent: "#94a3b8",
    description: "Silver Birch"
  },

  // Poplar and Willow - Blues and silvers
  "Plop tremurător": {
    icon: TreeDeciduous,
    gradient: "from-sky-600 via-blue-700 to-sky-800",
    accent: "#0284c7",
    description: "Aspen"
  },
  "Plop alb": {
    icon: TreeDeciduous,
    gradient: "from-blue-500 via-sky-600 to-blue-700",
    accent: "#3b82f6",
    description: "White Poplar"
  },
  "Plop negru": {
    icon: TreeDeciduous,
    gradient: "from-blue-700 via-slate-800 to-blue-900",
    accent: "#1e40af",
    description: "Black Poplar"
  },
  "Salcie albă": {
    icon: TreeDeciduous,
    gradient: "from-cyan-500 via-blue-600 to-cyan-700",
    accent: "#06b6d4",
    description: "White Willow"
  },

  // Acacia - Yellows
  "Salcâm": {
    icon: TreeDeciduous,
    gradient: "from-yellow-500 via-amber-600 to-yellow-700",
    accent: "#eab308",
    description: "Black Locust"
  },

  // Fruit trees - Pinks and reds
  "Cireș sălbatic": {
    icon: TreeDeciduous,
    gradient: "from-rose-600 via-pink-700 to-rose-800",
    accent: "#e11d48",
    description: "Wild Cherry"
  },
  "Măr sălbatic": {
    icon: TreeDeciduous,
    gradient: "from-red-500 via-rose-600 to-red-700",
    accent: "#ef4444",
    description: "Wild Apple"
  },
  "Păr sălbatic": {
    icon: TreeDeciduous,
    gradient: "from-pink-600 via-rose-700 to-pink-800",
    accent: "#db2777",
    description: "Wild Pear"
  },
  "Sorb de munte": {
    icon: TreeDeciduous,
    gradient: "from-orange-600 via-red-700 to-orange-800",
    accent: "#ea580c",
    description: "Rowan"
  },

  // Nut trees - Browns
  "Nuc": {
    icon: TreeDeciduous,
    gradient: "from-stone-700 via-amber-800 to-stone-900",
    accent: "#78716c",
    description: "Walnut"
  },
  "Castanul": {
    icon: TreeDeciduous,
    gradient: "from-amber-800 via-stone-900 to-amber-950",
    accent: "#92400e",
    description: "Sweet Chestnut"
  },

  // Conifers - Blues and greens
  "Molid": {
    icon: TreePine,
    gradient: "from-green-800 via-emerald-900 to-green-950",
    accent: "#14532d",
    description: "Norway Spruce"
  },
  "Brad": {
    icon: TreePine,
    gradient: "from-emerald-800 via-teal-900 to-emerald-950",
    accent: "#064e3b",
    description: "Silver Fir"
  },
  "Pin silvestru": {
    icon: TreePine,
    gradient: "from-teal-700 via-cyan-800 to-teal-900",
    accent: "#0f766e",
    description: "Scots Pine"
  },
  "Pin negru": {
    icon: TreePine,
    gradient: "from-slate-800 via-gray-900 to-slate-950",
    accent: "#1e293b",
    description: "Black Pine"
  },
  "Larice": {
    icon: TreePine,
    gradient: "from-orange-800 via-amber-900 to-orange-950",
    accent: "#9a3412",
    description: "European Larch"
  },
  "Zâmbru": {
    icon: TreePine,
    gradient: "from-cyan-800 via-blue-900 to-cyan-950",
    accent: "#155e75",
    description: "Swiss Pine"
  },
  "Tisă": {
    icon: TreePine,
    gradient: "from-red-900 via-green-950 to-red-950",
    accent: "#7f1d1d",
    description: "Yew"
  },

  // Mixed/Generic
  "Amestec": {
    icon: Trees,
    gradient: "from-green-700 via-emerald-800 to-teal-900",
    accent: "#15803d",
    description: "Mixed Forest"
  },
  "Altele": {
    icon: Trees,
    gradient: "from-slate-700 via-gray-800 to-slate-900",
    accent: "#475569",
    description: "Other Species"
  }
};

// Get visual configuration for a species, with fallback
export function getSpeciesVisual(species: string | undefined): SpeciesVisual {
  if (!species) {
    return speciesVisuals["Amestec"];
  }

  return speciesVisuals[species] || speciesVisuals["Altele"];
}

// Generate a unique gradient based on species name hash (fallback for unknown species)
export function generateSpeciesGradient(species: string): string {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < species.length; i++) {
    hash = ((hash << 5) - hash) + species.charCodeAt(i);
    hash = hash & hash;
  }

  const colors = [
    "from-emerald-600 to-teal-700",
    "from-blue-600 to-cyan-700",
    "from-green-600 to-lime-700",
    "from-amber-600 to-orange-700",
    "from-teal-600 to-emerald-700",
    "from-cyan-600 to-blue-700"
  ];

  return colors[Math.abs(hash) % colors.length];
}
