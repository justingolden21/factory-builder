/*
Belt transport simulation.

Moves a single item between belt tiles each tick in a deterministic order.
*/

import type { Inventory, WorldState } from '$lib/game/types';
import { takeOne } from '$lib/game/world/inventory';
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

export const applyBeltTransport = (world: WorldState, ticks: number): WorldState => {
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
    const plannedMoves: Array<{ fromId: string; toId: string; item: Inventory }> = [];
    const blockedTargets = new Set<string>();
    const entityKeys = Object.keys(nextEntities).sort();

    for (const id of entityKeys) {
      const entity = nextEntities[id];
      if (!entity || entity.type !== 'belt' || !entity.beltItem) {
        continue;
      }

      const delta = directionDeltas[entity.direction];
      if (!delta) {
        continue;
      }

      const tile = tileOfEntity(entity);
      const targetX = tile.x + delta.x;
      const targetY = tile.y + delta.y;
      const target = getEntityAt(nextWorld, targetX, targetY);

      if (!target || target.beltItem || blockedTargets.has(target.id)) {
        continue;
      }

      const [, taken] = takeOne(entity.beltItem);
      if (!taken) {
        continue;
      }

      plannedMoves.push({ fromId: entity.id, toId: target.id, item: taken });
      blockedTargets.add(target.id);
    }

    if (plannedMoves.length === 0) {
      continue;
    }

    ensureWorldClone();

    for (const move of plannedMoves) {
      const from = nextEntities[move.fromId];
      const to = nextEntities[move.toId];

      if (!from || !to || !from.beltItem || to.beltItem) {
        continue;
      }

      nextEntities[move.fromId] = {
        ...from,
        beltItem: null
      };
      nextEntities[move.toId] = {
        ...to,
        beltItem: move.item
      };
    }
  }

  return changed ? nextWorld : world;
};
