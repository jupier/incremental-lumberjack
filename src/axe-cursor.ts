import { Graphics, Application, Container } from "pixi.js";

/**
 * Create a circle cursor that also shows cooldown
 */
function createCircleCursor(): Graphics {
  const circle = new Graphics();
  const radius = 12; // Circle radius
  
  // Draw circle outline
  circle.circle(0, 0, radius);
  circle.stroke({ width: 2, color: 0xffffff });
  
  // Add a small dot at the center to show exact click point
  circle.circle(0, 0, 2);
  circle.fill(0xffffff);
  
  // Pivot at center for cursor positioning
  circle.pivot.set(0, 0);

  return circle;
}

/**
 * Update circle cursor to show cooldown state as a loading ring
 */
function updateCircleCursor(circle: Graphics, progress: number): void {
  const radius = 12;
  const strokeWidth = 3;
  circle.clear();
  
  if (progress >= 1 || progress <= 0) {
    // Ready state - white circle border, no fill
    circle.circle(0, 0, radius);
    circle.stroke({ width: strokeWidth, color: 0xffffff });
  } else {
    // Cooldown state - gray border that gradually becomes white
    const startAngle = -Math.PI / 2; // Start at top
    const totalAngle = Math.PI * 2;
    const progressAngle = progress * totalAngle;
    
    // Draw full gray circle border (background)
    circle.circle(0, 0, radius);
    circle.stroke({ width: strokeWidth, color: 0x808080 });
    
    // Draw white progress arc (from top, clockwise) that replaces gray
    if (progress > 0) {
      const endAngle = startAngle + progressAngle;
      
      // Draw the white arc using moveTo and arc
      // Move to start point
      const startX = Math.cos(startAngle) * radius;
      const startY = Math.sin(startAngle) * radius;
      circle.moveTo(startX, startY);
      
      // Draw arc from start to end
      circle.arc(0, 0, radius, startAngle, endAngle);
      circle.stroke({ width: strokeWidth, color: 0xffffff });
    }
  }
  
  // Always draw the center dot to show exact click point
  circle.circle(0, 0, 2);
  circle.fill(0xffffff);
}

/**
 * Setup custom circle cursor that follows the mouse and shows cooldown
 */
export function setupAxeCursor(
  app: Application,
  onCooldownUpdate?: (progress: number) => void
): { container: Container; triggerSwing: () => void; updateCooldown: (progress: number) => void } {
  // Hide default cursor everywhere
  app.canvas.style.cursor = "none";
  document.body.style.cursor = "none";
  document.documentElement.style.cursor = "none";
  
  // Ensure cursor stays hidden
  const hideCursor = () => {
    app.canvas.style.cursor = "none";
    document.body.style.cursor = "none";
    document.documentElement.style.cursor = "none";
  };
  
  // Hide cursor on various events
  app.canvas.addEventListener("mouseenter", hideCursor);
  app.canvas.addEventListener("mouseover", hideCursor);
  window.addEventListener("mousemove", hideCursor);

  // Create circle cursor
  const circleCursor = createCircleCursor();
  const cursorContainer = new Container();
  cursorContainer.addChild(circleCursor);
  
  // Initialize circle (ready state)
  updateCircleCursor(circleCursor, 1);
  
  // Add to stage (on top of everything)
  app.stage.addChild(cursorContainer);
  
  // Track mouse position
  let mouseX = 0;
  let mouseY = 0;

  // Update cursor position on mouse move
  app.canvas.addEventListener("mousemove", (e: MouseEvent) => {
    const rect = app.canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    
    // Update cursor position
    cursorContainer.x = mouseX;
    cursorContainer.y = mouseY;
  });

  // Also update on mouse enter (in case mouse enters from outside)
  app.canvas.addEventListener("mouseenter", (e: MouseEvent) => {
    const rect = app.canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    cursorContainer.x = mouseX;
    cursorContainer.y = mouseY;
  });

  // Store reference to update cooldown
  let cooldownUpdateCallback: ((progress: number) => void) | undefined = onCooldownUpdate;
  
  // Expose function to update cooldown (updates circle visual)
  const updateCooldown = (progress: number) => {
    if (cooldownUpdateCallback) {
      cooldownUpdateCallback(progress);
    }
    // Update circle cursor to show cooldown state
    updateCircleCursor(circleCursor, progress);
  };
  
  // No-op swing function (no animation needed for circle)
  const triggerSwing = () => {
    // Circle doesn't need swing animation
  };

  return { 
    container: cursorContainer, 
    triggerSwing,
    updateCooldown 
  };
}
