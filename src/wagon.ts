import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { TileData } from "./map";

export interface Wagon {
  container: Container;
  tileX: number;
  tileY: number;
  targetTileX: number | null;
  targetTileY: number | null;
  carriedWoodCount: number;
  capacity: number;
  speed: number; // pixels per second (effective)
}

const WAGON_CAPACITY_LABEL_NAME = "wagonCapacityLabel";

function updateWagonCapacityLabel(wagon: Wagon): void {
  const label = wagon.container.getChildByName(
    WAGON_CAPACITY_LABEL_NAME
  ) as Text | null;
  if (!label) return;
  label.text = `${wagon.carriedWoodCount}/${wagon.capacity}`;
}

/**
 * Create a wagon sprite
 */
export function createWagon(): Container {
  const wagon = new Container();

  // Create a simple rectangular wagon
  const body = new Graphics();
  body.rect(-15, -10, 30, 20);
  body.fill(0x8b4513); // Brown color
  wagon.addChild(body);

  // Add wheels
  const wheel1 = new Graphics();
  wheel1.circle(-10, 8, 5);
  wheel1.fill(0x2a2a2a); // Dark gray
  wagon.addChild(wheel1);

  const wheel2 = new Graphics();
  wheel2.circle(10, 8, 5);
  wheel2.fill(0x2a2a2a);
  wagon.addChild(wheel2);

  const capacityLabel = new Text({
    text: "0/1",
    style: new TextStyle({
      fontFamily: "Arial",
      fontSize: 11,
      fill: 0xffffff,
      fontWeight: "bold",
      stroke: { color: 0x000000, width: 3 },
    }),
  });
  capacityLabel.name = WAGON_CAPACITY_LABEL_NAME;
  capacityLabel.anchor.set(0.5);
  capacityLabel.x = 0;
  capacityLabel.y = -22;
  wagon.addChild(capacityLabel);

  return wagon;
}

/**
 * Find the closest wood piece to the wagon
 */
export function findClosestWood(
  wagonTileX: number,
  wagonTileY: number,
  tiles: TileData[][],
  mapWidth: number,
  mapHeight: number
): { tileX: number; tileY: number } | null {
  let closestWood: { tileX: number; tileY: number; distance: number } | null =
    null;

  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const tile = tiles[y]?.[x];
      if (
        tile &&
        tile.item === "wood" &&
        tile.woodPieces &&
        tile.woodPieces.length > 0
      ) {
        const distance = Math.abs(x - wagonTileX) + Math.abs(y - wagonTileY); // Manhattan distance
        if (!closestWood || distance < closestWood.distance) {
          closestWood = { tileX: x, tileY: y, distance };
        }
      }
    }
  }

  return closestWood
    ? { tileX: closestWood.tileX, tileY: closestWood.tileY }
    : null;
}

/**
 * Get the collect zone center coordinates
 */
export function getCollectZoneCenter(
  mapWidth: number,
  mapHeight: number
): { tileX: number; tileY: number } {
  return {
    tileX: Math.floor(mapWidth / 2),
    tileY: Math.floor(mapHeight / 2),
  };
}

function getTileCenter(
  tileX: number,
  tileY: number,
  tileSize: number
): {
  x: number;
  y: number;
} {
  return {
    x: tileX * tileSize + tileSize / 2,
    y: tileY * tileSize + tileSize / 2,
  };
}

function isWalkableTile(
  tileX: number,
  tileY: number,
  tiles: TileData[][],
  mapWidth: number,
  mapHeight: number
): boolean {
  if (tileX < 0 || tileX >= mapWidth || tileY < 0 || tileY >= mapHeight) {
    return false;
  }
  const tile = tiles[tileY]?.[tileX];
  if (!tile) return false;
  // Wagon cannot pass through trees (same idea as player collision).
  return tile.item !== "tree";
}

function getNextStepTowardTarget(
  fromTileX: number,
  fromTileY: number,
  toTileX: number,
  toTileY: number,
  tiles: TileData[][],
  mapWidth: number,
  mapHeight: number
): { tileX: number; tileY: number } | null {
  const dx = toTileX - fromTileX;
  const dy = toTileY - fromTileY;

  if (dx === 0 && dy === 0) return null;

  const stepX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
  const stepY = dy === 0 ? 0 : dy > 0 ? 1 : -1;

  // Prefer moving along the axis with the larger remaining distance (keeps motion purposeful).
  const candidates: Array<{ tileX: number; tileY: number }> =
    Math.abs(dx) >= Math.abs(dy)
      ? [
          { tileX: fromTileX + stepX, tileY: fromTileY },
          { tileX: fromTileX, tileY: fromTileY + stepY },
        ]
      : [
          { tileX: fromTileX, tileY: fromTileY + stepY },
          { tileX: fromTileX + stepX, tileY: fromTileY },
        ];

  for (const candidate of candidates) {
    if (
      isWalkableTile(
        candidate.tileX,
        candidate.tileY,
        tiles,
        mapWidth,
        mapHeight
      )
    ) {
      return candidate;
    }
  }

  return null;
}

/**
 * Setup wagon movement and collection logic
 */
export function setupWagon(
  wagon: Wagon,
  app: any,
  tileSize: number,
  mapWidth: number,
  mapHeight: number,
  tiles: TileData[][],
  woodContainer: Container,
  onWoodDeposited: (count: number) => void,
  isInCollectZone: (
    tileX: number,
    tileY: number,
    mapWidth: number,
    mapHeight: number
  ) => boolean
): void {
  const collectZoneCenter = getCollectZoneCenter(mapWidth, mapHeight);
  let { x: currentX, y: currentY } = getTileCenter(
    wagon.tileX,
    wagon.tileY,
    tileSize
  );
  let targetX = currentX;
  let targetY = currentY;
  let isMoving = false;

  // Update wagon visual position
  wagon.container.x = currentX;
  wagon.container.y = currentY;
  updateWagonCapacityLabel(wagon);

  app.ticker.add((ticker: any) => {
    const deltaTime = ticker.deltaMS / 1000; // Convert to seconds
    const moveSpeed = wagon.speed * deltaTime;

    // If we are moving, interpolate towards the next tile center (tile-by-tile, like player).
    if (isMoving) {
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < moveSpeed) {
        // Reached target
        currentX = targetX;
        currentY = targetY;
        isMoving = false;

        // Update wagon tile position
        wagon.tileX = Math.floor(currentX / tileSize);
        wagon.tileY = Math.floor(currentY / tileSize);

        // If we're in the collect zone, deposit everything we're carrying.
        if (
          wagon.carriedWoodCount > 0 &&
          isInCollectZone(wagon.tileX, wagon.tileY, mapWidth, mapHeight)
        ) {
          const deposited = wagon.carriedWoodCount;
          wagon.carriedWoodCount = 0;
          onWoodDeposited(deposited);
          updateWagonCapacityLabel(wagon);
        }
      } else {
        // Move towards target
        const moveX = (dx / distance) * moveSpeed;
        const moveY = (dy / distance) * moveSpeed;
        currentX += moveX;
        currentY += moveY;
      }

      wagon.container.x = currentX;
      wagon.container.y = currentY;
    } else {
      // Not moving: decide what the *target tile* should be, then take ONE step toward it.
      const collectZoneWaitTile = collectZoneCenter;

      // If we're on a wood tile, pick up one piece immediately (even if we didn't "just arrive"),
      // so capacity upgrades actually work without needing extra movement.
      if (wagon.carriedWoodCount < wagon.capacity) {
        const currentTile = tiles[wagon.tileY]?.[wagon.tileX];
        if (
          currentTile &&
          currentTile.item === "wood" &&
          currentTile.woodPieces &&
          currentTile.woodPieces.length > 0
        ) {
          const woodPiece = currentTile.woodPieces.shift()!;
          woodContainer.removeChild(woodPiece);
          wagon.carriedWoodCount += 1;
          updateWagonCapacityLabel(wagon);

          if (currentTile.woodPieces.length === 0) {
            currentTile.item = null;
            currentTile.woodPieces = undefined;
          }
        }
      }

      const isWagonFull = wagon.carriedWoodCount >= wagon.capacity;

      if (
        wagon.carriedWoodCount > 0 &&
        (isWagonFull ||
          !findClosestWood(
            wagon.tileX,
            wagon.tileY,
            tiles,
            mapWidth,
            mapHeight
          ))
      ) {
        // Go to collect zone (any tile inside zone deposits, but we path toward center).
        wagon.targetTileX = collectZoneWaitTile.tileX;
        wagon.targetTileY = collectZoneWaitTile.tileY;
      } else {
        // If we already have a wood-target but it's now empty, clear it.
        if (wagon.targetTileX != null && wagon.targetTileY != null) {
          const targetTile = tiles[wagon.targetTileY]?.[wagon.targetTileX];
          const isStillWoodTarget =
            targetTile &&
            targetTile.item === "wood" &&
            targetTile.woodPieces &&
            targetTile.woodPieces.length > 0;
          if (!isStillWoodTarget) {
            wagon.targetTileX = null;
            wagon.targetTileY = null;
          }
        }

        if (wagon.targetTileX == null || wagon.targetTileY == null) {
          // Find closest wood (only when we need a new target).
          const closestWood = findClosestWood(
            wagon.tileX,
            wagon.tileY,
            tiles,
            mapWidth,
            mapHeight
          );

          if (closestWood) {
            wagon.targetTileX = closestWood.tileX;
            wagon.targetTileY = closestWood.tileY;
          } else {
            // No wood available: go to collect zone and wait there.
            wagon.targetTileX = collectZoneWaitTile.tileX;
            wagon.targetTileY = collectZoneWaitTile.tileY;
          }
        }
      }

      // If we're already at the target (e.g. waiting), do nothing.
      if (
        wagon.targetTileX === wagon.tileX &&
        wagon.targetTileY === wagon.tileY
      ) {
        return;
      }

      // Take one tile step toward target, then move smoothly to that tile center.
      if (wagon.targetTileX != null && wagon.targetTileY != null) {
        const nextStep = getNextStepTowardTarget(
          wagon.tileX,
          wagon.tileY,
          wagon.targetTileX,
          wagon.targetTileY,
          tiles,
          mapWidth,
          mapHeight
        );

        if (!nextStep) {
          // Can't reach (blocked): just clear target for now.
          wagon.targetTileX = null;
          wagon.targetTileY = null;
          return;
        }

        const nextCenter = getTileCenter(
          nextStep.tileX,
          nextStep.tileY,
          tileSize
        );
        targetX = nextCenter.x;
        targetY = nextCenter.y;
        isMoving = true;
      }
    }
  });
}
