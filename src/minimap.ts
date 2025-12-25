import { Graphics, Container, Text } from "pixi.js";
import { TileData } from "./map";

const MINIMAP_TILE_SIZE = 2; // Size of each tile in the minimap
const MINIMAP_PADDING = 10;
const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 200;

export function createMinimap(
  tiles: TileData[][],
  mapWidth: number,
  mapHeight: number
): Container {
  const minimapContainer = new Container();

  // Create background for minimap
  const background = new Graphics();
  background.rect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);
  background.fill(0x000000);
  background.alpha = 0.7;
  minimapContainer.addChild(background);

  // Calculate scale to fit map in minimap
  const scaleX = (MINIMAP_WIDTH - MINIMAP_PADDING * 2) / mapWidth;
  const scaleY = (MINIMAP_HEIGHT - MINIMAP_PADDING * 2) / mapHeight;
  const scale = Math.min(scaleX, scaleY);

  // Draw tiles
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const tile = tiles[y][x];
      const pixelX = MINIMAP_PADDING + x * scale;
      const pixelY = MINIMAP_PADDING + y * scale;

      const tileGraphic = new Graphics();
      tileGraphic.rect(pixelX, pixelY, scale, scale);

      if (tile.item === "tree") {
        tileGraphic.fill(0x228b22); // Green for trees
      } else {
        tileGraphic.fill(0x6b8e23); // Dark green for grass
      }

      minimapContainer.addChild(tileGraphic);
    }
  }

  // Draw collect zone (3x3 tiles at center of map)
  const centerX = Math.floor(mapWidth / 2);
  const centerY = Math.floor(mapHeight / 2);
  const collectZoneSize = 3;
  const collectZoneStartX = centerX - 1;
  const collectZoneStartY = centerY - 1;

  const collectZoneGraphic = new Graphics();
  const zonePixelX = MINIMAP_PADDING + collectZoneStartX * scale;
  const zonePixelY = MINIMAP_PADDING + collectZoneStartY * scale;
  collectZoneGraphic.rect(
    zonePixelX,
    zonePixelY,
    collectZoneSize * scale,
    collectZoneSize * scale
  );
  collectZoneGraphic.fill({ color: 0x4169e1, alpha: 0.5 }); // Blue for collect zone
  collectZoneGraphic.name = "collectZone";
  minimapContainer.addChild(collectZoneGraphic);

  // Position minimap in top right corner
  minimapContainer.x = window.innerWidth - MINIMAP_WIDTH - 10;
  minimapContainer.y = 10;

  return minimapContainer;
}

export function updateMinimapPlayer(
  minimap: Container,
  playerTileX: number,
  playerTileY: number,
  mapWidth: number,
  mapHeight: number
): void {
  // Remove old player indicator if it exists
  const oldIndicator = minimap.getChildByName("playerIndicator");
  if (oldIndicator) {
    minimap.removeChild(oldIndicator);
  }

  // Calculate scale
  const scaleX = (MINIMAP_WIDTH - MINIMAP_PADDING * 2) / mapWidth;
  const scaleY = (MINIMAP_HEIGHT - MINIMAP_PADDING * 2) / mapHeight;
  const scale = Math.min(scaleX, scaleY);

  // Create player indicator
  const playerIndicator = new Graphics();
  playerIndicator.name = "playerIndicator";
  const pixelX = MINIMAP_PADDING + playerTileX * scale;
  const pixelY = MINIMAP_PADDING + playerTileY * scale;
  playerIndicator.circle(pixelX + scale / 2, pixelY + scale / 2, scale / 2);
  playerIndicator.fill(0xff0000); // Red dot for player
  minimap.addChild(playerIndicator);
}

