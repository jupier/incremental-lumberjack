import { Graphics, Container, Text, TextStyle } from "pixi.js";

const WEAPON_SLOT_SIZE = 50;
const WEAPON_SLOT_PADDING = 10;
const BAR_HEIGHT = 80;
const BAR_PADDING = 20;
const BAR_WIDTH = 400;

export interface WeaponSlot {
  container: Container;
  icon: Graphics;
  cooldownBar: Graphics;
  cooldownProgress: number;
  isWood?: boolean; // True if this slot contains wood instead of a weapon
  count?: number; // Number of wood pieces in this slot
  countText?: Text; // Text element for displaying wood count
}

export function createWeaponBar(): {
  container: Container;
  slots: WeaponSlot[];
} {
  const barContainer = new Container();
  const slots: WeaponSlot[] = [];

  // Create background for weapon bar (centered, 400px wide)
  const background = new Graphics();
  background.rect(0, 0, BAR_WIDTH, BAR_HEIGHT);
  background.fill(0x2c2c2c);
  background.alpha = 0.9;
  barContainer.addChild(background);

  // Create axe weapon slot
  const axeSlot = createWeaponSlot("Axe");
  // Center the slot horizontally in the 400px bar
  axeSlot.container.x = (BAR_WIDTH - WEAPON_SLOT_SIZE) / 2;
  axeSlot.container.y = 8; // Position from top of bar
  barContainer.addChild(axeSlot.container);
  slots.push(axeSlot);

  // Position bar at bottom center of screen
  barContainer.x = (window.innerWidth - BAR_WIDTH) / 2;
  barContainer.y = window.innerHeight - BAR_HEIGHT;

  return { container: barContainer, slots };
}

export function addWoodToBar(barContainer: Container, slots: WeaponSlot[]): void {
  // Find existing wood slot or create new one
  let woodSlot = slots.find(slot => slot.isWood);
  
  if (!woodSlot) {
    // Create new wood slot
    woodSlot = createWoodSlot();
    // Position it to the right of the axe slot
    const axeSlot = slots[0];
    woodSlot.container.x = axeSlot.container.x + WEAPON_SLOT_SIZE + WEAPON_SLOT_PADDING;
    woodSlot.container.y = 8;
    barContainer.addChild(woodSlot.container);
    slots.push(woodSlot);
  }

  // Increment wood count
  woodSlot.count = (woodSlot.count || 0) + 1;
  updateWoodSlotCount(woodSlot);
}

export function removeWoodFromBar(barContainer: Container, slots: WeaponSlot[]): boolean {
  const woodSlot = slots.find(slot => slot.isWood);
  if (woodSlot && woodSlot.count && woodSlot.count > 0) {
    woodSlot.count -= 1;
    updateWoodSlotCount(woodSlot);
    
    // Remove slot if count reaches 0
    if (woodSlot.count === 0) {
      const index = slots.indexOf(woodSlot);
      if (index > -1) {
        slots.splice(index, 1);
        barContainer.removeChild(woodSlot.container);
      }
      return true;
    }
    return true;
  }
  return false;
}

function createWoodSlot(): WeaponSlot {
  const slotContainer = new Container();

  // Create slot background
  const slotBg = new Graphics();
  slotBg.rect(0, 0, WEAPON_SLOT_SIZE, WEAPON_SLOT_SIZE);
  slotBg.fill(0x1a1a1a);
  slotBg.stroke({ width: 2, color: 0x8b4513 }); // Brown border for wood
  slotContainer.addChild(slotBg);

  // Create wood icon
  const icon = new Graphics();
  const iconCenterX = WEAPON_SLOT_SIZE / 2;
  const iconCenterY = WEAPON_SLOT_SIZE / 2;
  // Draw a simple wood log
  icon.rect(iconCenterX - 6, iconCenterY - 4, 12, 8);
  icon.fill(0x8b4513); // Brown
  // Add texture lines
  icon.rect(iconCenterX - 5, iconCenterY - 3, 10, 1);
  icon.fill(0x654321); // Darker brown
  icon.rect(iconCenterX - 5, iconCenterY + 2, 10, 1);
  icon.fill(0x654321);
  slotContainer.addChild(icon);

  // Create count text (will be updated)
  const countStyle = new TextStyle({
    fontFamily: "Arial",
    fontSize: 12,
    fill: 0xffffff,
    fontWeight: "bold",
    align: "center",
  });
  const countText = new Text({ text: "0", style: countStyle });
  countText.anchor.set(0.5);
  countText.x = WEAPON_SLOT_SIZE / 2;
  countText.y = WEAPON_SLOT_SIZE / 2;
  slotContainer.addChild(countText);

  return {
    container: slotContainer,
    icon,
    cooldownBar: new Graphics(), // Not used for wood
    cooldownProgress: 0,
    isWood: true,
    count: 0,
    countText,
  };
}

function updateWoodSlotCount(slot: WeaponSlot): void {
  if (slot.countText) {
    slot.countText.text = (slot.count || 0).toString();
  }
}

function createWeaponSlot(weaponName: string): WeaponSlot {
  const slotContainer = new Container();

  // Create slot background
  const slotBg = new Graphics();
  slotBg.rect(0, 0, WEAPON_SLOT_SIZE, WEAPON_SLOT_SIZE);
  slotBg.fill(0x1a1a1a);
  slotBg.stroke({ width: 2, color: 0x555555 });
  slotContainer.addChild(slotBg);

  // Create weapon icon (simple axe icon) - centered in slot
  const icon = new Graphics();
  const iconCenterX = WEAPON_SLOT_SIZE / 2;
  const iconCenterY = WEAPON_SLOT_SIZE / 2;
  // Axe handle
  icon.rect(iconCenterX - 2, iconCenterY - 8, 4, 16);
  icon.fill(0x8b4513); // Brown handle
  // Axe head
  icon.rect(iconCenterX + 2, iconCenterY - 8, 10, 6);
  icon.fill(0x808080); // Gray metal
  // Axe blade
  icon.rect(iconCenterX + 12, iconCenterY - 6, 2, 3);
  icon.fill(0xc0c0c0); // Light gray blade
  slotContainer.addChild(icon);

  // Create cooldown bar (below the slot, within bar height)
  const cooldownBar = new Graphics();
  cooldownBar.y = WEAPON_SLOT_SIZE + 3;
  cooldownBar.visible = false;
  slotContainer.addChild(cooldownBar);

  // Add weapon name label (smaller, positioned above cooldown bar)
  const nameStyle = new TextStyle({
    fontFamily: "Arial",
    fontSize: 8,
    fill: 0xffffff,
    align: "center",
  });
  const nameText = new Text({ text: weaponName, style: nameStyle });
  nameText.anchor.set(0.5);
  nameText.x = WEAPON_SLOT_SIZE / 2;
  nameText.y = WEAPON_SLOT_SIZE + 15;
  slotContainer.addChild(nameText);

  return {
    container: slotContainer,
    icon,
    cooldownBar,
    cooldownProgress: 0,
  };
}

export function updateWeaponCooldown(
  slot: WeaponSlot,
  progress: number
): void {
  const barWidth = WEAPON_SLOT_SIZE;
  const barHeight = 4;

  slot.cooldownBar.clear();
  slot.cooldownProgress = progress;

  if (progress > 0 && progress < 1) {
    slot.cooldownBar.visible = true;

    // Draw background (gray)
    slot.cooldownBar.rect(0, 0, barWidth, barHeight);
    slot.cooldownBar.fill(0x333333);

    // Draw progress (green to yellow to red)
    const progressWidth = barWidth * progress;
    if (progressWidth > 0) {
      let color = 0x00ff00; // Green
      if (progress < 0.5) {
        color = 0xffff00; // Yellow
      }
      if (progress < 0.25) {
        color = 0xff0000; // Red
      }
      slot.cooldownBar.rect(0, 0, progressWidth, barHeight);
      slot.cooldownBar.fill(color);
    }
  } else {
    slot.cooldownBar.visible = false;
  }
}

