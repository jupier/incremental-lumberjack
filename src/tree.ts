import { Graphics } from "pixi.js";

export type TreeType = "normal" | "strong" | "ancient";

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
    woodDropCount: 6,
    trunkColor: 0x6b3f1f,
    foliageColor: 0x0f6b1f,
  },
  ancient: {
    maxHealth: 10,
    woodDropCount: 10,
    trunkColor: 0x4a2c1a,
    foliageColor: 0x1b4d8a,
  },
};

export function createTree(type: TreeType = "normal"): Graphics {
  // Create a simple tree using Graphics
  const tree = new Graphics();
  const spec = TREE_SPECS[type];

  // Draw the trunk
  if (type === "ancient") {
    // Wider trunk
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
  } else {
    // Ancient: big canopy + crown
    tree.circle(0, -24, 24);
    tree.fill(spec.foliageColor);
    tree.circle(0, -40, 14);
    tree.fill(0x2e86de);
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
