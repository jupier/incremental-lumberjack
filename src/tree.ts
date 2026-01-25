import { Graphics } from "pixi.js";

export type TreeType = "normal" | "strong" | "ancient" | "magical" | "crystal" | "legendary";

const TREE_SPECS: Record<
  TreeType,
  {
    maxHealth: number;
    woodDropCount: number;
    trunkColor: number;
    foliageColor: number;
  }
> = {
  normal: {
    maxHealth: 3,
    woodDropCount: 3,
    trunkColor: 0x8b4513,
    foliageColor: 0x228b22,
  },
  strong: {
    maxHealth: 6,
    woodDropCount: 10, // Increased from 6
    trunkColor: 0x6b3f1f,
    foliageColor: 0x0f6b1f,
  },
  ancient: {
    maxHealth: 10,
    woodDropCount: 25, // Increased from 10
    trunkColor: 0x4a2c1a,
    foliageColor: 0x1b4d8a,
  },
  magical: {
    maxHealth: 15,
    woodDropCount: 50, // Increased from 15
    trunkColor: 0x6a1b9a,
    foliageColor: 0x9c27b0,
  },
  crystal: {
    maxHealth: 20,
    woodDropCount: 100, // Increased from 20
    trunkColor: 0x00bcd4,
    foliageColor: 0x00e5ff,
  },
  legendary: {
    maxHealth: 30,
    woodDropCount: 200, // Increased from 30
    trunkColor: 0xffd700,
    foliageColor: 0xffeb3b,
  },
};

export function createTree(type: TreeType = "normal"): Graphics {
  // Create a simple tree using Graphics
  const tree = new Graphics();
  const spec = TREE_SPECS[type];

  // Draw the trunk
  if (type === "legendary") {
    tree.rect(-10, -16, 20, 36);
  } else if (type === "crystal") {
    tree.rect(-9, -15, 18, 34);
  } else if (type === "magical") {
    tree.rect(-9, -15, 18, 34);
  } else if (type === "ancient") {
    tree.rect(-8, -14, 16, 32);
  } else if (type === "strong") {
    tree.rect(-7, -15, 14, 31);
  } else {
    tree.rect(-6, -16, 12, 30);
  }
  tree.fill(spec.trunkColor);

  // Draw the foliage (different sprite per type)
  if (type === "normal") {
    tree.circle(0, -20, 20);
    tree.fill(spec.foliageColor);
  } else if (type === "strong") {
    // Cluster foliage
    tree.circle(-10, -20, 16);
    tree.fill(spec.foliageColor);
    tree.circle(10, -20, 16);
    tree.fill(spec.foliageColor);
    tree.circle(0, -30, 18);
    tree.fill(spec.foliageColor);
  } else if (type === "ancient") {
    // Ancient: big canopy + crown
    tree.circle(0, -24, 24);
    tree.fill(spec.foliageColor);
    tree.circle(0, -40, 14);
    tree.fill(0x2e86de);
  } else if (type === "magical") {
    // Magical: glowing purple spheres with sparkles
    tree.circle(0, -26, 26);
    tree.fill(spec.foliageColor);
    tree.circle(-12, -28, 12);
    tree.fill(0xba68c8);
    tree.circle(12, -28, 12);
    tree.fill(0xba68c8);
    tree.circle(0, -44, 10);
    tree.fill(0xe1bee7);
    // Sparkles
    tree.circle(-8, -20, 3);
    tree.fill(0xffffff);
    tree.circle(8, -20, 3);
    tree.fill(0xffffff);
  } else if (type === "crystal") {
    // Crystal: geometric crystal shapes
    tree.circle(0, -28, 28);
    tree.fill(spec.foliageColor);
    // Crystal points
    tree.poly([-14, -30, 0, -50, 14, -30]);
    tree.fill(0x80deea);
    tree.poly([-20, -26, -10, -40, 0, -26]);
    tree.fill(0x4dd0e1);
    tree.poly([20, -26, 10, -40, 0, -26]);
    tree.fill(0x4dd0e1);
  } else if (type === "legendary") {
    // Legendary: golden tree with multiple layers
    tree.circle(0, -30, 30);
    tree.fill(spec.foliageColor);
    tree.circle(-15, -32, 18);
    tree.fill(0xfff59d);
    tree.circle(15, -32, 18);
    tree.fill(0xfff59d);
    tree.circle(0, -48, 16);
    tree.fill(0xffc107);
    tree.circle(0, -58, 12);
    tree.fill(0xffeb3b);
    // Golden glow effect
    tree.circle(0, -30, 32);
    tree.stroke({ width: 2, color: 0xffd700, alpha: 0.6 });
  }

  // Tree is drawn centered at origin (0, 0)
  // When positioned at tile center, it will be perfectly centered

  // Make tree interactive and clickable
  tree.eventMode = "static";
  tree.cursor = "pointer";

  // Add health property to tree
  (tree as any).treeType = type;
  (tree as any).baseMaxHealth = spec.maxHealth;
  (tree as any).health = spec.maxHealth;
  (tree as any).maxHealth = spec.maxHealth;
  (tree as any).woodDropCount = spec.woodDropCount;

  return tree;
}
