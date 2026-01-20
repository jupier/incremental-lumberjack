import { Graphics, Container } from "pixi.js";
import { createTree, TreeType } from "./tree";

export type TileItem = "tree" | "wood" | null;

export interface MapConfig {
  width: number; // Number of tiles wide
  height: number; // Number of tiles tall
  tileSize: number; // Size of each tile in pixels
  treeDensity?: number; // Probability of a tile having a tree (0-1)
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
  tiles: TileData[][];
} {
  const grassContainer = new Container();
  const treesContainer = new Container();
  const tiles: TileData[][] = [];
  const TREE_DENSITY = config.treeDensity ?? 0.2; // Default 20% of tiles get trees
  const tileSize = config.tileSize;

  // Phase 1: Create all grass tiles first
  for (let y = 0; y < config.height; y++) {
    tiles[y] = [];
    for (let x = 0; x < config.width; x++) {
      // Check if this is a border tile
      const isBorder = x === 0 || x === config.width - 1 || y === 0 || y === config.height - 1;
      
      // Create grass tile (only draw borders on right and bottom to avoid outer border)
      const isRightEdge = x === config.width - 1;
      const isBottomEdge = y === config.height - 1;
      const tile = createGrassTile(tileSize, isRightEdge, isBottomEdge, isBorder);
      tile.x = x * tileSize;
      tile.y = y * tileSize;
      // Enable culling on individual tiles for better performance
      tile.cullable = true;
      grassContainer.addChild(tile);

      // Initialize tile data (no items yet)
      tiles[y][x] = { x, y, item: null };
    }
  }

  // Phase 2: Add trees in separate container (skip border tiles)
  for (let y = 0; y < config.height; y++) {
    for (let x = 0; x < config.width; x++) {
      // Skip border tiles (first and last row/column)
      const isBorder = x === 0 || x === config.width - 1 || y === 0 || y === config.height - 1;
      if (isBorder) {
        continue; // Leave border tiles empty
      }
      
      // Place trees randomly across the map (only normal trees by default)
      if (Math.random() < TREE_DENSITY) {
        const treeType: TreeType = "normal"; // Only normal trees by default
        const tree = createTree(treeType);
        const treeX = x * tileSize + tileSize / 2;
        const treeY = y * tileSize + tileSize / 2;

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

  return { grassContainer, treesContainer, tiles };
}

/**
 * Add trees to empty tiles on the map
 */
export function addTreesToMap(
  tiles: TileData[][],
  treesContainer: Container,
  mapWidth: number,
  mapHeight: number,
  tileSize: number,
  treeDensity: number,
  treeType: TreeType = "normal"
): number {
  let treesAdded = 0;
  
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      // Skip border tiles
      const isBorder = x === 0 || x === mapWidth - 1 || y === 0 || y === mapHeight - 1;
      if (isBorder) {
        continue;
      }
      
      const tile = tiles[y]?.[x];
      // Only add trees to empty tiles
      if (tile && tile.item === null && Math.random() < treeDensity) {
        const tree = createTree(treeType);
        const treeX = x * tileSize + tileSize / 2;
        const treeY = y * tileSize + tileSize / 2;

        tree.x = treeX;
        tree.y = treeY;
        tree.cullable = true;
        treesContainer.addChild(tree);

        // Update tile data with tree reference
        tile.item = "tree";
        tile.tree = tree;
        tile.treeType = treeType;
        treesAdded++;
      }
    }
  }
  
  return treesAdded;
}

function createGrassTile(tileSize: number, isRightEdge: boolean, isBottomEdge: boolean, isBorder: boolean = false): Graphics {
  const tile = new Graphics();

  // Draw grass tile with special color for border tiles
  // Use Math.ceil to ensure tiles don't get cut off
  const tileWidth = Math.ceil(tileSize);
  const tileHeight = Math.ceil(tileSize);
  tile.rect(0, 0, tileWidth, tileHeight);
  if (isBorder) {
    tile.fill(0x3d5a3d); // Darker gray-green for border tiles
  } else {
    tile.fill(0x6b8e23); // Darker olive green base
  }

  // Add borders only on right and bottom edges (to avoid outer border)
  // Right edge border - draw at the edge, not 1px inside
  if (!isRightEdge) {
    tile.rect(tileWidth - 1, 0, 1, tileHeight);
    tile.fill(0x556b2f); // Even darker green border
  }
  
  // Bottom edge border - draw at the edge, not 1px inside
  if (!isBottomEdge) {
    tile.rect(0, tileHeight - 1, tileWidth, 1);
    tile.fill(0x556b2f); // Even darker green border
  }

  return tile;
}
