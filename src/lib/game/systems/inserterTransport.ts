/*
Inserter transport simulation.

Moves one item from the tile behind an inserter to the tile in front.
*/

import type { Inventory, WorldState } from '$lib/game/types';
import { addOne, takeOne } from '$lib/game/world/inventory';
import { getEntityAt, tileOfEntity } from '$lib/game/world/tiles';

type DirectionDelta = {
  x: number;
  y: number;
};

const directionDeltas: Record<string, DirectionDelta> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 }
};

export const applyInserterTransport = (world: WorldState, ticks: number): WorldState => {
  if (ticks <= 0) {
    return world;
  }

  let nextWorld = world;
  let nextEntities = world.entities;
  let changed = false;

  const ensureWorldClone = () => {
    if (changed) {
      return;
    }

    nextEntities = { ...nextEntities };
    nextWorld = {
      ...nextWorld,
      entities: nextEntities
    };
    changed = true;
  };

  for (let tick = 0; tick < ticks; tick += 1) {
    const entityKeys = Object.keys(nextEntities).sort();

    for (const id of entityKeys) {
      const inserter = nextEntities[id];
      if (!inserter || inserter.type !== 'inserter') {
        continue;
      }

      const delta = directionDeltas[inserter.direction];
      if (!delta) {
        continue;
      }

      const tile = tileOfEntity(inserter);
      const outputX = tile.x + delta.x;
      const outputY = tile.y + delta.y;
      const inputX = tile.x - delta.x;
      const inputY = tile.y - delta.y;

      const input = getEntityAt(nextWorld, inputX, inputY);
      const output = getEntityAt(nextWorld, outputX, outputY);

      if (!input || input.type !== 'belt' || !input.beltItem) {
        continue;
      }

      const [remaining, taken] = takeOne(input.beltItem);
      if (!taken) {
        continue;
      }

      if (!output) {
        continue;
      }

      if (output.type === 'belt') {
        if (output.beltItem) {
          continue;
        }

        ensureWorldClone();
        nextEntities[input.id] = {
          ...input,
          beltItem: remaining
        };
        nextEntities[output.id] = {
          ...output,
          beltItem: taken
        };
      } else if (output.type === 'chest') {
        const existing = output.inventory;
        if (existing && existing.type !== taken.type) {
          continue;
        }

        ensureWorldClone();
        nextEntities[input.id] = {
          ...input,
          beltItem: remaining
        };
        nextEntities[output.id] = {
          ...output,
          inventory: addOne(existing ?? null, taken.type)
        };
      }
    }
  }

  return changed ? nextWorld : world;
};
