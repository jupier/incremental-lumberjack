import { Container, Graphics, Text, TextStyle } from "pixi.js";

export interface Improvement {
  id: string;
  name: string;
  description: string;
  cost: number;
  purchased: boolean;
}

export interface ImprovementsState {
  improvedAxe: boolean;
  doubleWoodCollection: boolean;
}

export function createImprovementsMenu(
  improvements: Improvement[],
  onPurchase: (improvementId: string) => void
): {
  container: Container;
  show: () => void;
  hide: () => void;
  update: (improvements: Improvement[]) => void;
} {
  const container = new Container();
  container.visible = false;

  const MENU_WIDTH = 500;
  const MENU_HEIGHT = 400;
  const MENU_PADDING = 20;
  const ITEM_HEIGHT = 80;
  const ITEM_SPACING = 10;

  // Create background
  const background = new Graphics();
  background.rect(0, 0, MENU_WIDTH, MENU_HEIGHT);
  background.fill(0x1a1a1a);
  background.alpha = 0.95;
  background.stroke({ width: 3, color: 0x4169e1 });
  container.addChild(background);

  // Create title
  const titleStyle = new TextStyle({
    fontFamily: "Arial",
    fontSize: 24,
    fill: 0xffffff,
    fontWeight: "bold",
    align: "center",
  });
  const title = new Text({ text: "Improvements", style: titleStyle });
  title.anchor.set(0.5);
  title.x = MENU_WIDTH / 2;
  title.y = 30;
  container.addChild(title);

  // Create improvement items container
  const itemsContainer = new Container();
  itemsContainer.y = 60;
  container.addChild(itemsContainer);

  // Center menu on screen
  container.x = (window.innerWidth - MENU_WIDTH) / 2;
  container.y = (window.innerHeight - MENU_HEIGHT) / 2;

  function createImprovementItem(
    improvement: Improvement,
    index: number
  ): Container {
    const itemContainer = new Container();
    itemContainer.y = index * (ITEM_HEIGHT + ITEM_SPACING);

    // Item background
    const itemBg = new Graphics();
    itemBg.rect(0, 0, MENU_WIDTH - MENU_PADDING * 2, ITEM_HEIGHT);
    itemBg.fill(improvement.purchased ? 0x2a4a2a : 0x2c2c2c);
    itemBg.alpha = 0.9;
    itemBg.stroke({
      width: 2,
      color: improvement.purchased ? 0x4a8a4a : 0x555555,
    });
    itemContainer.addChild(itemBg);

    // Improvement name
    const nameStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 18,
      fill: 0xffffff,
      fontWeight: "bold",
    });
    const nameText = new Text({ text: improvement.name, style: nameStyle });
    nameText.x = 15;
    nameText.y = 10;
    itemContainer.addChild(nameText);

    // Improvement description
    const descStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 12,
      fill: 0xcccccc,
    });
    const descText = new Text({
      text: improvement.description,
      style: descStyle,
    });
    descText.x = 15;
    descText.y = 35;
    itemContainer.addChild(descText);

    // Cost or purchased status
    const costStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 14,
      fill: improvement.purchased ? 0x4a8a4a : 0xffaa00,
      fontWeight: "bold",
    });
    const costText = new Text({
      text: improvement.purchased
        ? "PURCHASED"
        : `Cost: ${improvement.cost} wood`,
      style: costStyle,
    });
    costText.x = MENU_WIDTH - MENU_PADDING * 2 - 150;
    costText.y = ITEM_HEIGHT / 2;
    costText.anchor.set(0, 0.5);
    itemContainer.addChild(costText);

    // Buy button (if not purchased)
    if (!improvement.purchased) {
      const buttonBg = new Graphics();
      buttonBg.rect(0, 0, 80, 30);
      buttonBg.fill(0x4169e1);
      buttonBg.stroke({ width: 2, color: 0x5a7ae1 });
      buttonBg.x = MENU_WIDTH - MENU_PADDING * 2 - 90;
      buttonBg.y = ITEM_HEIGHT - 40;
      buttonBg.eventMode = "static";
      buttonBg.cursor = "pointer";
      buttonBg.on("pointerdown", () => {
        onPurchase(improvement.id);
      });
      itemContainer.addChild(buttonBg);

      const buttonText = new Text({
        text: "Buy",
        style: new TextStyle({
          fontFamily: "Arial",
          fontSize: 12,
          fill: 0xffffff,
          fontWeight: "bold",
        }),
      });
      buttonText.anchor.set(0.5);
      buttonText.x = buttonBg.x + 40;
      buttonText.y = buttonBg.y + 15;
      itemContainer.addChild(buttonText);
    }

    return itemContainer;
  }

  function updateItems() {
    itemsContainer.removeChildren();
    improvements.forEach((improvement, index) => {
      const item = createImprovementItem(improvement, index);
      itemsContainer.addChild(item);
    });
  }

  // Initial update
  updateItems();

  return {
    container,
    show: () => {
      container.visible = true;
    },
    hide: () => {
      container.visible = false;
    },
    update: (newImprovements: Improvement[]) => {
      improvements = newImprovements;
      updateItems();
    },
  };
}
