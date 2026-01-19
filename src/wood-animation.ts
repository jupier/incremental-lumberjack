import { Application, Container, Graphics } from "pixi.js";
import { createWoodPiece } from "./wood";

interface WoodAnimation {
  woodPiece: Graphics;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  duration: number;
  elapsed: number;
}

/**
 * Animate wood pieces sliding from tree position to wood counter
 */
export function animateWoodCollection(
  app: Application,
  world: Container,
  worldX: number,
  worldY: number,
  targetScreenX: number,
  targetScreenY: number,
  count: number,
  onComplete: (collectedCount: number) => void
): void {
  const animations: WoodAnimation[] = [];
  const animationDuration = 1.5; // seconds (slower for better visibility)
  const staggerDelay = 0.1; // seconds between each piece

  // Create wood pieces and set up animations
  for (let i = 0; i < count; i++) {
    const woodPiece = createWoodPiece();
    
    // Start position in world coordinates
    const startX = worldX;
    const startY = worldY;
    
    // Target position in screen coordinates (wood counter)
    const targetX = targetScreenX;
    const targetY = targetScreenY;
    
    // Convert world position to screen position for initial placement
    const screenStartX = startX + world.x;
    const screenStartY = startY + world.y;
    
    woodPiece.x = screenStartX;
    woodPiece.y = screenStartY;
    
    // Add to a temporary container on the stage (above everything)
    // We'll use the app stage directly for animations
    app.stage.addChild(woodPiece);
    
    const animation: WoodAnimation = {
      woodPiece,
      startX: screenStartX,
      startY: screenStartY,
      targetX,
      targetY,
      progress: 0,
      duration: animationDuration,
      elapsed: i * staggerDelay, // Stagger animations
    };
    
    animations.push(animation);
  }

  // Animate all wood pieces
  const tickerCallback = (ticker: any) => {
    const deltaTime = ticker.deltaMS / 1000; // Convert to seconds
    
    for (let i = animations.length - 1; i >= 0; i--) {
      const anim = animations[i];
      
      // Update elapsed time
      anim.elapsed += deltaTime;
      
      if (anim.elapsed < 0) {
        // Not started yet (stagger delay)
        continue;
      }
      
      // Calculate progress (0 to 1)
      anim.progress = Math.min(1, anim.elapsed / anim.duration);
      
      // Ease out animation (fast start, slow end)
      const eased = 1 - Math.pow(1 - anim.progress, 3);
      
      // Interpolate position from start to target (both in screen coordinates)
      const currentX = anim.startX + (anim.targetX - anim.startX) * eased;
      const currentY = anim.startY + (anim.targetY - anim.startY) * eased;
      
      // Update wood piece position (in screen coordinates)
      anim.woodPiece.x = currentX;
      anim.woodPiece.y = currentY;
      
      // Scale down as it approaches target (optional visual effect)
      const scale = 1 - eased * 0.5; // Scale from 1 to 0.5
      anim.woodPiece.scale.set(scale);
      
      // Fade out as it approaches target
      anim.woodPiece.alpha = 1 - eased * 0.7; // Fade from 1 to 0.3
      
      // Check if animation is complete
      if (anim.progress >= 1) {
        // Remove wood piece
        app.stage.removeChild(anim.woodPiece);
        animations.splice(i, 1);
      }
    }
    
    // If all animations are complete, remove ticker
    if (animations.length === 0) {
      app.ticker.remove(tickerCallback);
      onComplete(count);
    }
  };
  
  app.ticker.add(tickerCallback);
}
