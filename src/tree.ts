import { Graphics } from "pixi.js";

export function createTree(): Graphics {
  // Create a simple tree using Graphics
  const tree = new Graphics();

  // Draw the trunk (brown rectangle) - smaller size, centered
  // Trunk: 12px wide, 40px tall, centered at origin
  tree.rect(-6, -16, 12, 30);
  tree.fill(0x8b4513); // Brown

  // Draw the foliage (green circle on top) - smaller size, centered
  // Foliage: radius 20px, positioned above trunk
  tree.circle(0, -20, 20);
  tree.fill(0x228b22); // Green

  // Tree is drawn centered at origin (0, 0)
  // When positioned at tile center, it will be perfectly centered

  // Make tree interactive and clickable
  tree.eventMode = "static";
  tree.cursor = "pointer";

  // Add click handler
  tree.on("pointerdown", () => {
    console.log("Tree clicked!");
    // Tree will be clickable - we'll add more functionality later
    tree.scale.set(tree.scale.x * 0.95); // Slight scale down on click for feedback
    setTimeout(() => {
      tree.scale.set(1.0); // Reset scale
    }, 100);
  });

  return tree;
}
