import { Graphics } from "pixi.js";

export function createWoodPiece(): Graphics {
  const wood = new Graphics();

  // Draw a simple wood log piece (brown rectangle)
  // Wood piece: 8px wide, 6px tall
  wood.rect(-4, -3, 8, 6);
  wood.fill(0x8b4513); // Brown

  // Add some texture lines
  wood.rect(-3, -2, 6, 1);
  wood.fill(0x654321); // Darker brown
  wood.rect(-3, 1, 6, 1);
  wood.fill(0x654321); // Darker brown

  return wood;
}
