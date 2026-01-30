/*
Inserter transport simulation.

Moves one item from the tile behind an inserter to the tile in front.
*/

import type { ItemStack, WorldState } from '$lib/game/types';

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

const tileKey = (x: number, y: number) => `${x}:${y}`;

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
    const tileMap = new Map<string, string>();

    for (const id of entityKeys) {
      const entity = nextEntities[id];
      if (!entity) {
        continue;
      }

      const key = tileKey(Math.floor(entity.position.x), Math.floor(entity.position.y));
      tileMap.set(key, id);
    }

    for (const id of entityKeys) {
      const inserter = nextEntities[id];
      if (!inserter || inserter.type !== 'inserter') {
        continue;
      }

      const delta = directionDeltas[inserter.direction];
      if (!delta) {
        continue;
      }

      const outputX = Math.floor(inserter.position.x) + delta.x;
      const outputY = Math.floor(inserter.position.y) + delta.y;
      const inputX = Math.floor(inserter.position.x) - delta.x;
      const inputY = Math.floor(inserter.position.y) - delta.y;

      const inputId = tileMap.get(tileKey(inputX, inputY));
      const outputId = tileMap.get(tileKey(outputX, outputY));
      const input = inputId ? nextEntities[inputId] : null;
      const output = outputId ? nextEntities[outputId] : null;

      if (!input || input.type !== 'belt' || !input.beltItem) {
        continue;
      }

      const item = input.beltItem;

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
          beltItem: null
        };
        nextEntities[output.id] = {
          ...output,
          beltItem: item
        };
      } else if (output.type === 'chest') {
        const existing = output.inventory;
        if (existing && existing.type !== item.type) {
          continue;
        }

        ensureWorldClone();
        nextEntities[input.id] = {
          ...input,
          beltItem: null
        };
        const nextInventory: ItemStack = {
          type: item.type,
          amount: (existing?.amount ?? 0) + item.amount
        };
        nextEntities[output.id] = {
          ...output,
          inventory: nextInventory
        };
      }
    }
  }

  return changed ? nextWorld : world;
};
