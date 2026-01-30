/*
Tile index utilities.

Provides shared helpers for mapping world tiles to entity ids.
*/

import type { EntityState, WorldState } from '$lib/game/types';

export const tileKey = (x: number, y: number): string => `${x}:${y}`;

export const tileOfEntity = (entity: EntityState): { x: number; y: number } => {
  return {
    x: Math.floor(entity.position.x),
    y: Math.floor(entity.position.y)
  };
};

export const getEntityIdAt = (world: WorldState, tileX: number, tileY: number): string | null => {
  return world.entityTiles[tileKey(tileX, tileY)] ?? null;
};

export const getEntityAt = (world: WorldState, tileX: number, tileY: number): EntityState | null => {
  const id = getEntityIdAt(world, tileX, tileY);
  return id ? world.entities[id] ?? null : null;
};
