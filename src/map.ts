import { Graphics, Container } from "pixi.js";
import { createTree } from "./tree";

const TILE_SIZE = 48; // Size of each tile in pixels

export type TileItem = "tree" | null;

export interface MapConfig {
  width: number; // Number of tiles wide
  height: number; // Number of tiles tall
}

export interface TileData {
  x: number; // Tile x coordinate
  y: number; // Tile y coordinate
  item: TileItem; // Item on this tile
}

export function createMap(config: MapConfig): {
  grassContainer: Container;
  treesContainer: Container;
  tiles: TileData[][];
} {
  const grassContainer = new Container();
  const treesContainer = new Container();
  const tiles: TileData[][] = [];

  // Calculate center spawn point
  const centerX = Math.floor(config.width / 2);
  const centerY = Math.floor(config.height / 2);
  const spawnRadius = 3;

  // Phase 1: Create all grass tiles first
  for (let y = 0; y < config.height; y++) {
    tiles[y] = [];
    for (let x = 0; x < config.width; x++) {
      // Create grass tile
      const tile = createGrassTile();
      tile.x = x * TILE_SIZE;
      tile.y = y * TILE_SIZE;
      grassContainer.addChild(tile);

      // Initialize tile data (no items yet)
      tiles[y][x] = { x, y, item: null };
    }
  }

  // Phase 2: Add trees in separate container
  for (let y = 0; y < config.height; y++) {
    for (let x = 0; x < config.width; x++) {
      // Check if this tile is in the spawn zone (circular 5x5 area)
      const distanceFromCenter = Math.sqrt(
        Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
      );
      const isInSpawnZone = distanceFromCenter <= spawnRadius;

      // Randomly place trees (20% chance), but not in spawn zone
      if (!isInSpawnZone && Math.random() < 0.2) {
        const tree = createTree();
        const treeX = x * TILE_SIZE + TILE_SIZE / 2;
        const treeY = y * TILE_SIZE + TILE_SIZE / 2;

        tree.x = treeX;
        tree.y = treeY;
        treesContainer.addChild(tree);

        // Update tile data
        tiles[y][x].item = "tree";
      }
    }
  }

  return { grassContainer, treesContainer, tiles };
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
