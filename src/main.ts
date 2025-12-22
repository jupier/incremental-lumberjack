import { Application, Text, Graphics, TextStyle } from "pixi.js";

// Create and initialize PixiJS application
const app = new Application();

await app.init({
  width: 800,
  height: 600,
  backgroundColor: 0x87ceeb, // Sky blue background
});

// Add the canvas to the DOM
document.body.appendChild(app.canvas as HTMLCanvasElement);

// Create text style for "Hello World!"
const helloStyle = new TextStyle({
  fontFamily: "Arial",
  fontSize: 48,
  fill: 0xffffff,
  align: "center",
});

// Add "Hello World!" text
const helloText = new Text({
  text: "Hello World!",
  style: helloStyle,
});
helloText.anchor.set(0.5);
helloText.x = app.screen.width / 2;
helloText.y = app.screen.height / 2;
app.stage.addChild(helloText);

// Create text style for "Welcome to PixiJS"
const welcomeStyle = new TextStyle({
  fontFamily: "Arial",
  fontSize: 24,
  fill: 0xc8c8c8,
  align: "center",
});

// Add "Welcome to PixiJS" text
const welcomeText = new Text({
  text: "Welcome to PixiJS",
  style: welcomeStyle,
});
welcomeText.anchor.set(0.5);
welcomeText.x = app.screen.width / 2;
welcomeText.y = app.screen.height / 2 + 60;
app.stage.addChild(welcomeText);

// Add a simple animated box
const box = new Graphics();
box.rect(-50, -50, 100, 100);
box.fill(0xffc800); // Yellow color
box.x = app.screen.width / 2;
box.y = app.screen.height / 2 + 120;
app.stage.addChild(box);

// Simple rotation animation
app.ticker.add(() => {
  box.rotation += 0.01; // Rotate the box
});
