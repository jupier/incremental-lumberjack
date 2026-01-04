import { Graphics, Container } from "pixi.js";
import { createTree, TreeType } from "./tree";
import {
  COLLECT_ZONE_SIZE_TILES,
  getCollectZoneBounds,
  isInCollectZoneClearArea,
} from "./collect-zone";

const TILE_SIZE = 48; // Size of each tile in pixels

export type TileItem = "tree" | "wood" | null;

export interface MapConfig {
  width: number; // Number of tiles wide
  height: number; // Number of tiles tall
}

export interface TileData {
  x: number; // Tile x coordinate
  y: number; // Tile y coordinate
  item: TileItem; // Item on this tile
  tree?: Graphics; // Reference to tree graphics if item is "tree"
  treeType?: TreeType;
  woodPieces?: Graphics[]; // Array of wood piece graphics if item is "wood"
}

export function createMap(config: MapConfig): {
  grassContainer: Container;
  treesContainer: Container;
  collectZoneContainer: Container;
  tiles: TileData[][];
} {
  const grassContainer = new Container();
  const treesContainer = new Container();
  const collectZoneContainer = new Container();
  const tiles: TileData[][] = [];
  const TREE_DENSITY = 0.75; // 75% of tiles get trees outside the clear area

  const collectZoneBounds = getCollectZoneBounds(config.width, config.height);

  const collectZone = new Graphics();
  // Draw a semi-transparent overlay for the collect zone
  collectZone.rect(
    collectZoneBounds.startTileX * TILE_SIZE,
    collectZoneBounds.startTileY * TILE_SIZE,
    COLLECT_ZONE_SIZE_TILES * TILE_SIZE,
    COLLECT_ZONE_SIZE_TILES * TILE_SIZE
  );
  collectZone.fill({ color: 0x4169e1, alpha: 0.3 }); // Blue tint with transparency

  // Draw border around the collect zone
  collectZone.rect(
    collectZoneBounds.startTileX * TILE_SIZE,
    collectZoneBounds.startTileY * TILE_SIZE,
    COLLECT_ZONE_SIZE_TILES * TILE_SIZE,
    COLLECT_ZONE_SIZE_TILES * TILE_SIZE
  );
  collectZone.stroke({ width: 3, color: 0x4169e1 }); // Blue border

  collectZoneContainer.addChild(collectZone);

  // Phase 1: Create all grass tiles first
  for (let y = 0; y < config.height; y++) {
    tiles[y] = [];
    for (let x = 0; x < config.width; x++) {
      // Create grass tile
      const tile = createGrassTile();
      tile.x = x * TILE_SIZE;
      tile.y = y * TILE_SIZE;
      // Enable culling on individual tiles for better performance
      tile.cullable = true;
      grassContainer.addChild(tile);

      // Initialize tile data (no items yet)
      tiles[y][x] = { x, y, item: null };
    }
  }

  // Phase 2: Add trees in separate container
  for (let y = 0; y < config.height; y++) {
    for (let x = 0; x < config.width; x++) {
      // Place trees on every tile except the 5x5 clear area around the collect zone
      if (
        !isInCollectZoneClearArea(x, y, config.width, config.height) &&
        Math.random() < TREE_DENSITY
      ) {
        const roll = Math.random();
        const treeType: TreeType =
          roll < 0.08 ? "ancient" : roll < 0.25 ? "strong" : "normal";
        const tree = createTree(treeType);
        const treeX = x * TILE_SIZE + TILE_SIZE / 2;
        const treeY = y * TILE_SIZE + TILE_SIZE / 2;

        tree.x = treeX;
        tree.y = treeY;
        // Enable culling on individual trees for better performance
        tree.cullable = true;
        treesContainer.addChild(tree);

        // Update tile data with tree reference
        tiles[y][x].item = "tree";
        tiles[y][x].tree = tree;
        tiles[y][x].treeType = treeType;
      }
    }
  }

  return { grassContainer, treesContainer, collectZoneContainer, tiles };
}

function createGrassTile(): Graphics {
  const tile = new Graphics();

  // Draw grass tile (darker, less shiny green)
  tile.rect(0, 0, TILE_SIZE, TILE_SIZE);
  tile.fill(0x6b8e23); // Darker olive green base

  // Add border for tile separation
  tile.rect(0, 0, TILE_SIZE, TILE_SIZE);
  tile.stroke({ width: 1, color: 0x556b2f }); // Even darker green border

  return tile;
}

export function getTileSize(): number {
  return TILE_SIZE;
}
