export type PublicMenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "Beliebt" | "Hauptgerichte" | "Beilagen" | "Getränke";
};

const menus: Record<string, PublicMenuItem[]> = {
  "the-greeks-mitte": [
    {
      id: "mitte-souvlaki",
      name: "Chicken Souvlaki",
      description: "Hähnchenspieße, Pita, Tzatziki und Salat",
      price: 15.5,
      category: "Beliebt",
    },
    {
      id: "mitte-moussaka",
      name: "Moussaka",
      description: "Aubergine, Kartoffeln, Rinderhack und Béchamel",
      price: 17,
      category: "Hauptgerichte",
    },
    {
      id: "mitte-mixed-grill",
      name: "Mixed Grill",
      description: "Souvlaki, Gyros, Bifteki, Pommes und Tzatziki",
      price: 24.5,
      category: "Hauptgerichte",
    },
    {
      id: "mitte-salad",
      name: "Griechischer Salat",
      description: "Tomate, Gurke, Feta, Oliven und rote Zwiebel",
      price: 9.5,
      category: "Beilagen",
    },
    {
      id: "mitte-gyros-pita",
      name: "Gyros Pita",
      description: "Gyros, Tzatziki, Tomate, Zwiebel und Pommes",
      price: 8.5,
      category: "Beliebt",
    },
    {
      id: "mitte-tzatziki",
      name: "Tzatziki",
      description: "Hausgemacht, mit Pita",
      price: 5,
      category: "Beilagen",
    },
    {
      id: "mitte-water",
      name: "Mineralwasser",
      description: "Still oder sprudelnd, 0,5 l",
      price: 3.5,
      category: "Getränke",
    },
  ],
  "pita-corner": [
    {
      id: "pita-falafel",
      name: "Falafel Pita",
      description: "Falafel, Tahini, Tomate, Gurke und Kräuter",
      price: 8,
      category: "Beliebt",
    },
    {
      id: "pita-gyros",
      name: "Gyros Pita",
      description: "Gyros, Tzatziki, Tomate, Zwiebel und Pommes",
      price: 8.5,
      category: "Hauptgerichte",
    },
    {
      id: "pita-halloumi",
      name: "Halloumi Bowl",
      description: "Halloumi, Couscous, Salat und Zitronendressing",
      price: 13.5,
      category: "Hauptgerichte",
    },
    {
      id: "pita-tzatziki",
      name: "Tzatziki",
      description: "Hausgemacht, mit Pita",
      price: 5,
      category: "Beilagen",
    },
    {
      id: "pita-lemonade",
      name: "Hauslimonade",
      description: "Zitrone und Minze, 0,4 l",
      price: 4,
      category: "Getränke",
    },
  ],
};

export function getPublicMenu(slug: string) {
  return menus[slug] ?? [];
}

const restaurantSlugs: Record<string, string> = {
  "restaurant-1": "the-greeks-mitte",
  "restaurant-2": "pita-corner",
};

export function getMenuForRestaurantId(restaurantId: string) {
  const slug = restaurantSlugs[restaurantId];
  return slug ? getPublicMenu(slug) : [];
}
