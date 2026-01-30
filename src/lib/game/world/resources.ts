/*
World resource helpers.

Owns resource lookup and immutable updates for resource tiles.
*/

import type { ResourceTile, WorldState } from '$lib/game/types';

export const resourceKey = (x: number, y: number): string => `${x}:${y}`;

export const getResourceAt = (world: WorldState, tileX: number, tileY: number): ResourceTile | null => {
  return world.resources[resourceKey(tileX, tileY)] ?? null;
};

export const withResourceAt = (
  world: WorldState,
  tileX: number,
  tileY: number,
  next: ResourceTile | null
): WorldState => {
  const key = resourceKey(tileX, tileY);
  const existing = world.resources[key] ?? null;

  if (existing === next) {
    return world;
  }

  if (!existing && !next) {
    return world;
  }

  const nextResources = { ...world.resources };

  if (next) {
    nextResources[key] = next;
  } else {
    delete nextResources[key];
  }

  return {
    ...world,
    resources: nextResources
  };
};
