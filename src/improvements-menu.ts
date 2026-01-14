import { Container, Graphics, Text, TextStyle } from "pixi.js";

export interface Improvement {
  id: string;
  name: string;
  description: string;
  cost: number;
  purchased: boolean;
  requires?: string; // ID of required improvement
  repeatable?: boolean;
  level?: number; // only meaningful when repeatable === true
  category: "axe" | "wagon";
  tier: number;
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

  const MENU_WIDTH = Math.min(980, window.innerWidth - 40);
  const MENU_HEIGHT = Math.min(540, window.innerHeight - 40);
  const MENU_PADDING = 20;
  const TITLE_HEIGHT = 60;

  const CONTENT_HEIGHT = MENU_HEIGHT - TITLE_HEIGHT - MENU_PADDING;

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

  // Center menu on screen
  container.x = (window.innerWidth - MENU_WIDTH) / 2;
  container.y = (window.innerHeight - MENU_HEIGHT) / 2;

  // Masked content area (prevents overflow)
  const mask = new Graphics();
  mask.rect(MENU_PADDING, TITLE_HEIGHT, MENU_WIDTH - MENU_PADDING * 2, CONTENT_HEIGHT);
  mask.fill(0x000000);
  container.addChild(mask);

  const treeViewport = new Container();
  treeViewport.x = MENU_PADDING;
  treeViewport.y = TITLE_HEIGHT;
  treeViewport.mask = mask;
  container.addChild(treeViewport);

  const treeRoot = new Container();
  treeViewport.addChild(treeRoot);

  // PoE-like tree feel: pan + zoom
  let treeScale = 1;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let treeStartX = 0;
  let treeStartY = 0;

  // Layout constants (radial)
  const NODE_R = 20;
  const RING_GAP = 74;
  const SECTION_GAP = 30;

  // Hover tooltip (details)
  const tooltip = new Container();
  tooltip.visible = false;
  container.addChild(tooltip);

  const tooltipBg = new Graphics();
  tooltip.addChild(tooltipBg);

  const tooltipTitle = new Text({
    text: "",
    style: new TextStyle({
      fontFamily: "Arial",
      fontSize: 14,
      fill: 0xffffff,
      fontWeight: "bold",
    }),
  });
  tooltip.addChild(tooltipTitle);

  const tooltipBody = new Text({
    text: "",
    style: new TextStyle({
      fontFamily: "Arial",
      fontSize: 12,
      fill: 0xdddddd,
      wordWrap: true,
      wordWrapWidth: 280,
    }),
  });
  tooltip.addChild(tooltipBody);

  function showTooltip(
    improvement: Improvement,
    isLocked: boolean,
    anchorX: number,
    anchorY: number
  ) {
    const level = improvement.level ?? 0;
    const levelLine = improvement.repeatable ? `Level: ${level}\n` : "";
    const requiresLine = improvement.requires
      ? `Requires: ${improvement.requires}\n`
      : "";
    const lockedLine = isLocked ? `Locked\n` : "";
    const purchasedLine =
      improvement.purchased && !improvement.repeatable ? `Purchased\n` : "";
    const costLine = improvement.purchased && !improvement.repeatable
      ? ""
      : `Cost: ${improvement.cost}\n`;

    tooltipTitle.text = improvement.name;
    tooltipBody.text =
      `${lockedLine}${purchasedLine}${costLine}${levelLine}${requiresLine}\n` +
      improvement.description;

    const padding = 10;
    const w = 300;
    tooltipBody.style.wordWrapWidth = w - padding * 2;
    tooltipBody.x = padding;
    tooltipBody.y = 34;
    tooltipTitle.x = padding;
    tooltipTitle.y = padding;

    const h = Math.max(90, tooltipBody.height + 44);
    tooltipBg.clear();
    tooltipBg.roundRect(0, 0, w, h, 10);
    tooltipBg.fill({ color: 0x101010, alpha: 0.95 });
    tooltipBg.stroke({ width: 2, color: 0x4169e1, alpha: 0.9 });

    // Position near the hovered node, but keep within menu bounds.
    const margin = 8;
    let x = container.toLocal({ x: anchorX, y: anchorY }).x + 18;
    let y = container.toLocal({ x: anchorX, y: anchorY }).y + 18;

    const maxX = MENU_WIDTH - w - margin;
    const maxY = MENU_HEIGHT - h - margin;
    x = Math.max(margin, Math.min(maxX, x));
    y = Math.max(margin, Math.min(maxY, y));

    tooltip.x = x;
    tooltip.y = y;
    tooltip.visible = true;
  }

  function hideTooltip() {
    tooltip.visible = false;
  }

  function createSectionTitle(text: string, x: number, y: number): Text {
    const t = new Text({
      text,
      style: new TextStyle({
        fontFamily: "Arial",
        fontSize: 18,
        fill: 0xffffff,
        fontWeight: "bold",
      }),
    });
    t.x = x;
    t.y = y;
    return t;
  }

  function createNode(improvement: Improvement, isLocked: boolean): Container {
    const node = new Container();
    node.eventMode = "static";
    node.cursor = isLocked ? "not-allowed" : "pointer";

    const ring = new Graphics();
    const baseFill = improvement.purchased ? 0x2a4a2a : 0x1f1f1f;
    const strokeColor = isLocked
      ? 0x666666
      : improvement.purchased
        ? 0x4a8a4a
        : 0x4169e1;
    const glowColor = improvement.purchased ? 0x4a8a4a : 0x4169e1;
    const isRoot = improvement.tier === 0;

    // Soft glow (PoE-ish)
    ring.circle(0, 0, NODE_R + 7);
    ring.fill({ color: glowColor, alpha: isLocked ? 0.05 : 0.12 });

    // Main node
    ring.circle(0, 0, NODE_R);
    ring.fill({ color: baseFill, alpha: isLocked ? 0.55 : 0.95 });
    ring.circle(0, 0, NODE_R);
    ring.stroke({ width: isRoot ? 4 : 3, color: strokeColor, alpha: 0.95 });

    // Inner icon-ish dot (just to differentiate roots)
    if (isRoot) {
      ring.circle(0, 0, 7);
      ring.fill({ color: improvement.category === "axe" ? 0xe74c3c : 0xf1c40f, alpha: 0.9 });
    } else {
      ring.circle(0, 0, 5);
      ring.fill({ color: 0xffffff, alpha: 0.12 });
    }

    node.addChild(ring);

    if (!isLocked) {
      node.on("pointerdown", () => onPurchase(improvement.id));
    }

    node.on("pointerover", () => {
      const gp = node.getGlobalPosition();
      showTooltip(improvement, isLocked, gp.x, gp.y);
    });
    node.on("pointerout", () => hideTooltip());

    if (isLocked) {
      const lockOverlay = new Graphics();
      lockOverlay.circle(0, 0, NODE_R + 8);
      lockOverlay.fill({ color: 0x000000, alpha: 0.25 });
      node.addChild(lockOverlay);
    }

    return node;
  }

  function createHubNode(x: number, y: number): Container {
    const hub = new Container();
    hub.x = x;
    hub.y = y;
    hub.eventMode = "static";
    hub.cursor = "pointer";

    const g = new Graphics();
    // Outer glow
    g.circle(0, 0, NODE_R + 12);
    g.fill({ color: 0x4169e1, alpha: 0.12 });
    // Main ring
    g.circle(0, 0, NODE_R + 4);
    g.fill({ color: 0x1f1f1f, alpha: 0.95 });
    g.circle(0, 0, NODE_R + 4);
    g.stroke({ width: 4, color: 0x4169e1, alpha: 0.95 });
    // Center dot
    g.circle(0, 0, 6);
    g.fill({ color: 0xffffff, alpha: 0.18 });
    hub.addChild(g);

    const hubInfo: Improvement = {
      id: "core",
      name: "Core",
      description: "Connects the Axe and Wagon trees",
      cost: 0,
      purchased: true,
      category: "axe",
      tier: 0,
    };

    hub.on("pointerover", () => {
      const gp = hub.getGlobalPosition();
      showTooltip(hubInfo, false, gp.x, gp.y);
    });
    hub.on("pointerout", () => hideTooltip());

    return hub;
  }

  function layoutTreeRadial(
    category: "axe" | "wagon",
    centerX: number,
    centerY: number,
    side: "left" | "right"
  ) {
    const items = improvements
      .filter((i) => i.category === category)
      .sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id));

    const lines = new Graphics();
    treeRoot.addChild(lines);

    // Tier -> items
    const tierMap = new Map<number, Improvement[]>();
    for (const it of items) {
      tierMap.set(it.tier, [...(tierMap.get(it.tier) ?? []), it]);
    }
    const tiers = [...tierMap.keys()].sort((a, b) => a - b);

    const nodeById = new Map<string, { node: Container; x: number; y: number }>();

    // Angle ranges for semi-circle (PoE-like clusters)
    const startAngle = side === "left" ? (Math.PI * 0.65) : (-Math.PI * 0.15);
    const endAngle = side === "left" ? (Math.PI * 1.35) : (Math.PI * 0.15);

    for (const tier of tiers) {
      const ringIndex = tiers.indexOf(tier);
      const ringRadius = ringIndex * RING_GAP;
      const tierItems = tierMap.get(tier) ?? [];

      if (ringIndex === 0) {
        // Root at center
        const it = tierItems[0];
        if (it) {
          const isLocked = it.requires
            ? !(hasImprovement && hasImprovement(it.requires))
            : false;
          const node = createNode(it, isLocked);
          node.x = centerX;
          node.y = centerY;
          treeRoot.addChild(node);
          nodeById.set(it.id, { node, x: node.x, y: node.y });
        }
        continue;
      }

      const count = tierItems.length;
      for (let idx = 0; idx < count; idx++) {
        const it = tierItems[idx];
        const isLocked = it.requires
          ? !(hasImprovement && hasImprovement(it.requires))
          : false;
        const node = createNode(it, isLocked);

        const t = count === 1 ? 0.5 : idx / (count - 1);
        const angle = startAngle + (endAngle - startAngle) * t;
        const x = centerX + Math.cos(angle) * ringRadius;
        const y = centerY + Math.sin(angle) * ringRadius;

        node.x = x;
        node.y = y;
        treeRoot.addChild(node);
        nodeById.set(it.id, { node, x, y });
      }
    }

    // Draw curved connections (quadratic Beziers)
    lines.clear();
    for (const it of items) {
      if (!it.requires) continue;
      const from = nodeById.get(it.requires);
      const to = nodeById.get(it.id);
      if (!from || !to) continue;

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const mx = (from.x + to.x) / 2;
      const my = (from.y + to.y) / 2;
      const nx = -dy;
      const ny = dx;
      const len = Math.max(1, Math.sqrt(nx * nx + ny * ny));
      const bend = 18;
      const cx = mx + (nx / len) * bend;
      const cy = my + (ny / len) * bend;

      // Offset start/end slightly so it connects to the edge of the node circle
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const sx = from.x + (dx / dist) * (NODE_R + 2);
      const sy = from.y + (dy / dist) * (NODE_R + 2);
      const ex = to.x - (dx / dist) * (NODE_R + 2);
      const ey = to.y - (dy / dist) * (NODE_R + 2);

      lines.moveTo(sx, sy);
      lines.quadraticCurveTo(cx, cy, ex, ey);
    }
    // Stroke after the path is built (Pixi Graphics API)
    lines.stroke({ width: 2, color: 0x5a7ae1, alpha: 0.75 });
  }

  function updateItems() {
    treeRoot.removeChildren();
    hideTooltip();

    const contentW = MENU_WIDTH - MENU_PADDING * 2;
    const sectionW = (contentW - SECTION_GAP) / 2;
    const axeX = 0;
    const wagonX = sectionW + SECTION_GAP;
    const sectionY = 10;

    treeRoot.addChild(createSectionTitle("Axe Improvements", axeX, 0));
    treeRoot.addChild(createSectionTitle("Wagon Improvements", wagonX, 0));

    const centerY = sectionY + 220;
    const hubX = contentW / 2;
    const rootSpacing = Math.min(140, sectionW / 2 - 60);
    const axeRootX = hubX - rootSpacing;
    const wagonRootX = hubX + rootSpacing;

    // Subtle background ring guides (PoE-ish)
    const guides = new Graphics();
    for (let r = 0; r <= 3; r++) {
      guides.circle(axeRootX, centerY, r * RING_GAP);
      guides.circle(wagonRootX, centerY, r * RING_GAP);
    }
    guides.stroke({ width: 1, color: 0xffffff, alpha: 0.06 });
    treeRoot.addChildAt(guides, 0);

    // Central hub + connectors
    const hubNode = createHubNode(hubX, centerY);
    treeRoot.addChild(hubNode);

    const hubLines = new Graphics();

    const linkBend = 22;
    // Hub -> Axe root
    hubLines.moveTo(hubX - (NODE_R + 12), centerY);
    hubLines.quadraticCurveTo(
      (hubX + axeRootX) / 2,
      centerY - linkBend,
      axeRootX + (NODE_R + 12),
      centerY
    );
    // Hub -> Wagon root
    hubLines.moveTo(hubX + (NODE_R + 12), centerY);
    hubLines.quadraticCurveTo(
      (hubX + wagonRootX) / 2,
      centerY - linkBend,
      wagonRootX - (NODE_R + 12),
      centerY
    );
    // Stroke after the path is built (Pixi Graphics API)
    hubLines.stroke({ width: 3, color: 0x5a7ae1, alpha: 0.65 });
    treeRoot.addChildAt(hubLines, 1);

    // Trees
    layoutTreeRadial("axe", axeRootX, centerY, "left");
    layoutTreeRadial("wagon", wagonRootX, centerY, "right");
  }

  updateItems();

  const handleWheel = (e: WheelEvent) => {
    if (!container.visible) return;
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
      // Zoom around mouse position (PoE-like)
      const delta = e.deltaY || 0;
      const zoomFactor = delta > 0 ? 0.92 : 1.08;
      const nextScale = Math.max(0.6, Math.min(1.8, treeScale * zoomFactor));
      if (nextScale === treeScale) return;

      const local = treeViewport.toLocal({ x: e.clientX, y: e.clientY });
      const beforeX = (local.x - treeRoot.x) / treeScale;
      const beforeY = (local.y - treeRoot.y) / treeScale;

      treeScale = nextScale;
      treeRoot.scale.set(treeScale);

      const afterX = beforeX * treeScale + treeRoot.x;
      const afterY = beforeY * treeScale + treeRoot.y;
      treeRoot.x += local.x - afterX;
      treeRoot.y += local.y - afterY;
    }
  };

  window.addEventListener("wheel", handleWheel, { passive: false });

  treeViewport.eventMode = "static";
  treeViewport.cursor = "grab";
  treeViewport.on("pointerdown", (e) => {
    isDragging = true;
    treeViewport.cursor = "grabbing";
    dragStartX = e.global.x;
    dragStartY = e.global.y;
    treeStartX = treeRoot.x;
    treeStartY = treeRoot.y;
  });
  treeViewport.on("pointerup", () => {
    isDragging = false;
    treeViewport.cursor = "grab";
  });
  treeViewport.on("pointerupoutside", () => {
    isDragging = false;
    treeViewport.cursor = "grab";
  });
  treeViewport.on("pointermove", (e) => {
    if (!isDragging) return;
    treeRoot.x = treeStartX + (e.global.x - dragStartX);
    treeRoot.y = treeStartY + (e.global.y - dragStartY);
  });

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
