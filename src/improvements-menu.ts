import { Container, Graphics, Text, TextStyle } from "pixi.js";

export interface Improvement {
  id: string;
  name: string;
  description: string;
  cost: number;
  purchased: boolean;
  requires?: string; // ID of required improvement
}

export interface ImprovementsState {
  improvedAxe: boolean;
  doubleWoodCollection: boolean;
}

export function createImprovementsMenu(
  improvements: Improvement[],
  onPurchase: (improvementId: string) => void,
  hasImprovement?: (improvementId: string) => boolean
): {
  container: Container;
  show: () => void;
  hide: () => void;
  update: (improvements: Improvement[]) => void;
  destroy: () => void;
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

  // Calculate scrollable area dimensions
  const TITLE_HEIGHT = 60;
  const SCROLLABLE_HEIGHT = MENU_HEIGHT - TITLE_HEIGHT - MENU_PADDING;
  const SCROLLBAR_WIDTH = 10;
  const SCROLLBAR_PADDING = 5;

  // Create mask for scrollable area
  const mask = new Graphics();
  mask.rect(
    MENU_PADDING,
    TITLE_HEIGHT,
    MENU_WIDTH - MENU_PADDING * 2 - SCROLLBAR_WIDTH - SCROLLBAR_PADDING,
    SCROLLABLE_HEIGHT
  );
  mask.fill(0x000000);
  container.addChild(mask);

  // Create improvement items container (will be masked)
  const itemsContainer = new Container();
  itemsContainer.x = MENU_PADDING;
  itemsContainer.y = TITLE_HEIGHT;
  itemsContainer.mask = mask;
  container.addChild(itemsContainer);

  // Scroll state
  let scrollPosition = 0;
  let maxScroll = 0;

  // Create scrollbar
  const scrollbarBg = new Graphics();
  scrollbarBg.rect(0, 0, SCROLLBAR_WIDTH, SCROLLABLE_HEIGHT);
  scrollbarBg.fill(0x333333);
  scrollbarBg.x = MENU_WIDTH - MENU_PADDING - SCROLLBAR_WIDTH;
  scrollbarBg.y = TITLE_HEIGHT;
  container.addChild(scrollbarBg);

  const scrollbarThumb = new Graphics();
  scrollbarThumb.rect(0, 0, SCROLLBAR_WIDTH - 2, 30);
  scrollbarThumb.fill(0x666666);
  scrollbarThumb.x = MENU_WIDTH - MENU_PADDING - SCROLLBAR_WIDTH + 1;
  scrollbarThumb.y = TITLE_HEIGHT + 1;
  scrollbarThumb.eventMode = "static";
  scrollbarThumb.cursor = "pointer";
  container.addChild(scrollbarThumb);

  function updateScrollbar() {
    if (maxScroll <= 0) {
      scrollbarThumb.visible = false;
      scrollbarBg.visible = false;
      return;
    }
    scrollbarThumb.visible = true;
    scrollbarBg.visible = true;

    // Calculate thumb height based on visible vs total content ratio
    const totalContentHeight =
      improvements.length * (ITEM_HEIGHT + ITEM_SPACING) - ITEM_SPACING;
    const thumbHeight = Math.max(
      20,
      (SCROLLABLE_HEIGHT / totalContentHeight) * SCROLLABLE_HEIGHT
    );
    const thumbMaxY = TITLE_HEIGHT + SCROLLABLE_HEIGHT - thumbHeight;
    const thumbY =
      TITLE_HEIGHT +
      (scrollPosition / maxScroll) * (SCROLLABLE_HEIGHT - thumbHeight);

    scrollbarThumb.clear();
    scrollbarThumb.rect(0, 0, SCROLLBAR_WIDTH - 2, thumbHeight);
    scrollbarThumb.fill(0x666666);
    scrollbarThumb.y = Math.max(TITLE_HEIGHT + 1, Math.min(thumbMaxY, thumbY));
  }

  function updateScrollPosition(newPosition: number) {
    scrollPosition = Math.max(0, Math.min(maxScroll, newPosition));
    itemsContainer.y = TITLE_HEIGHT - scrollPosition;
    updateScrollbar();
  }

  // Add wheel event listener for scrolling
  const handleWheel = (e: WheelEvent) => {
    if (!container.visible) return;

    // Check if mouse is over the menu
    const menuRect = {
      left: container.x,
      top: container.y,
      right: container.x + MENU_WIDTH,
      bottom: container.y + MENU_HEIGHT,
    };

    if (
      e.clientX >= menuRect.left &&
      e.clientX <= menuRect.right &&
      e.clientY >= menuRect.top &&
      e.clientY <= menuRect.bottom
    ) {
      e.preventDefault();
      const delta = e.deltaY || e.deltaX || 0;
      updateScrollPosition(scrollPosition + delta * 0.5);
    }
  };

  window.addEventListener("wheel", handleWheel, { passive: false });

  // Center menu on screen
  container.x = (window.innerWidth - MENU_WIDTH) / 2;
  container.y = (window.innerHeight - MENU_HEIGHT) / 2;

  function createImprovementItem(
    improvement: Improvement,
    index: number,
    hasImprovement?: (improvementId: string) => boolean
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
      const requirementMet = improvement.requires
        ? hasImprovement && hasImprovement(improvement.requires)
        : true;
      const isLocked = improvement.requires && !requirementMet;

      buttonBg.rect(0, 0, 80, 30);
      buttonBg.fill(isLocked ? 0x666666 : 0x4169e1);
      buttonBg.stroke({ width: 2, color: isLocked ? 0x888888 : 0x5a7ae1 });
      buttonBg.x = MENU_WIDTH - MENU_PADDING * 2 - 90;
      buttonBg.y = ITEM_HEIGHT - 40;
      buttonBg.eventMode = "static";
      buttonBg.cursor = isLocked ? "not-allowed" : "pointer";
      if (!isLocked) {
        buttonBg.on("pointerdown", () => {
          onPurchase(improvement.id);
        });
      }
      itemContainer.addChild(buttonBg);

      const buttonText = new Text({
        text: isLocked ? "Locked" : "Buy",
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
      const item = createImprovementItem(improvement, index, hasImprovement);
      itemsContainer.addChild(item);
    });

    // Calculate max scroll based on content height
    const totalContentHeight =
      improvements.length * (ITEM_HEIGHT + ITEM_SPACING) - ITEM_SPACING;
    maxScroll = Math.max(0, totalContentHeight - SCROLLABLE_HEIGHT);

    // Reset scroll position if content is smaller than viewport
    if (scrollPosition > maxScroll) {
      scrollPosition = maxScroll;
    }

    updateScrollPosition(scrollPosition);
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
    destroy: () => {
      window.removeEventListener("wheel", handleWheel);
    },
  };
}
