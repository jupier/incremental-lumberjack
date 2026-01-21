import { Container, Graphics, Text, TextStyle } from "pixi.js";

export function createRoundTimer(): {
  container: Container;
  updateTime: (seconds: number) => void;
} {
  const container = new Container();

  // Create background
  const background = new Graphics();
  background.rect(0, 0, 200, 60);
  background.fill(0x2c2c2c);
  background.alpha = 0.9;
  background.stroke({ width: 2, color: 0x4169e1 });
  container.addChild(background);

  // Create label
  const labelStyle = new TextStyle({
    fontFamily: "Arial",
    fontSize: 16,
    fill: 0xffffff,
    fontWeight: "bold",
  });
  const label = new Text({ text: "Time:", style: labelStyle });
  label.x = 10;
  label.y = 10;
  container.addChild(label);

  // Create time text
  const timeStyle = new TextStyle({
    fontFamily: "Arial",
    fontSize: 24,
    fill: 0xffffff,
    fontWeight: "bold",
  });
  const timeText = new Text({ text: "30", style: timeStyle });
  timeText.x = 10;
  timeText.y = 32;
  container.addChild(timeText);

  // Position at top center
  container.x = window.innerWidth / 2 - 100; // Center horizontally
  container.y = 10;

  // Update position on window resize
  const handleResize = () => {
    container.x = window.innerWidth / 2 - 100;
  };
  window.addEventListener("resize", handleResize);

  return {
    container,
    updateTime: (seconds: number) => {
      const displaySeconds = Math.ceil(seconds);
      timeText.text = displaySeconds.toString();
      // Change color as time runs out
      if (displaySeconds <= 5) {
        timeText.style.fill = 0xff0000; // Red when low
      } else if (displaySeconds <= 10) {
        timeText.style.fill = 0xffaa00; // Orange when getting low
      } else {
        timeText.style.fill = 0xffffff; // White normally
      }
    },
  };
}
