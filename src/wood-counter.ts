import { Container, Graphics, Text, TextStyle } from "pixi.js";

export function createWoodCounter(): {
  container: Container;
  updateCount: (count: number) => void;
} {
  const container = new Container();

  // Create background
  const background = new Graphics();
  background.rect(0, 0, 150, 50);
  background.fill(0x2c2c2c);
  background.alpha = 0.9;
  background.stroke({ width: 2, color: 0x8b4513 });
  container.addChild(background);

  // Create label
  const labelStyle = new TextStyle({
    fontFamily: "Arial",
    fontSize: 14,
    fill: 0xffffff,
    fontWeight: "bold",
  });
  const label = new Text({ text: "Wood:", style: labelStyle });
  label.x = 10;
  label.y = 10;
  container.addChild(label);

  // Create count text
  const countStyle = new TextStyle({
    fontFamily: "Arial",
    fontSize: 18,
    fill: 0xffffff,
    fontWeight: "bold",
  });
  const countText = new Text({ text: "0", style: countStyle });
  countText.x = 10;
  countText.y = 28;
  container.addChild(countText);

  // Position in upper left
  container.x = 10;
  container.y = 10;

  return {
    container,
    updateCount: (count: number) => {
      countText.text = count.toString();
    },
  };
}

