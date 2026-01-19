import { Graphics } from "pixi.js";

export function createWoodPiece(): Graphics {
  const wood = new Graphics();

  // Draw a simple wood log piece (brown rectangle)
  // Wood piece: 16px wide, 12px tall (larger for better visibility)
  wood.rect(-8, -6, 16, 12);
  wood.fill(0x8b4513); // Brown

  // Add some texture lines
  wood.rect(-6, -4, 12, 2);
  wood.fill(0x654321); // Darker brown
  wood.rect(-6, 2, 12, 2);
  wood.fill(0x654321); // Darker brown

  return wood;
}
