export const COLLECT_ZONE_SIZE_TILES = 3; // 3x3
export const COLLECT_ZONE_CLEAR_SIZE_TILES = 5; // 5x5 (tree-free) around collect zone

export type TilePoint = { tileX: number; tileY: number };

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Bottom-left-ish collect zone placement.
 *
 * We choose a center so that a 5x5 clear square (radius 2) is always inside the map when possible.
 */
export function getCollectZoneCenter(
  mapWidth: number,
  mapHeight: number
): TilePoint {
  if (mapWidth < 5 || mapHeight < 5) {
    return { tileX: Math.floor(mapWidth / 2), tileY: Math.floor(mapHeight / 2) };
  }

  const preferredTileX = 2;
  const preferredTileY = mapHeight - 3;

  return {
    tileX: clampInt(preferredTileX, 2, mapWidth - 3),
    tileY: clampInt(preferredTileY, 2, mapHeight - 3),
  };
}

export function getCollectZoneBounds(
  mapWidth: number,
  mapHeight: number
): { startTileX: number; startTileY: number; endTileX: number; endTileY: number } {
  const center = getCollectZoneCenter(mapWidth, mapHeight);
  const half = Math.floor(COLLECT_ZONE_SIZE_TILES / 2); // 1
  return {
    startTileX: center.tileX - half,
    startTileY: center.tileY - half,
    endTileX: center.tileX + half,
    endTileY: center.tileY + half,
  };
}

export function isInCollectZone(
  tileX: number,
  tileY: number,
  mapWidth: number,
  mapHeight: number
): boolean {
  const b = getCollectZoneBounds(mapWidth, mapHeight);
  return tileX >= b.startTileX && tileX <= b.endTileX && tileY >= b.startTileY && tileY <= b.endTileY;
}

export function isInCollectZoneClearArea(
  tileX: number,
  tileY: number,
  mapWidth: number,
  mapHeight: number
): boolean {
  const center = getCollectZoneCenter(mapWidth, mapHeight);
  const half = Math.floor(COLLECT_ZONE_CLEAR_SIZE_TILES / 2); // 2
  return (
    tileX >= center.tileX - half &&
    tileX <= center.tileX + half &&
    tileY >= center.tileY - half &&
    tileY <= center.tileY + half
  );
}


