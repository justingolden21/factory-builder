/*
Drill mining simulation.

Consumes resource tiles under drills and fills a small internal buffer over time.
*/

import type { ItemSlot, WorldState } from '$lib/game/types';
import { getResourceAt, resourceKey } from '$lib/game/world/resources';
import { canTake, insertOneInto, takeOneFrom } from '$lib/game/world/itemTransfer';
import { getEntityAt } from '$lib/game/world/tiles';

const FIXED_STEP_MS = 50;
const DRILL_MINE_RATE = 1;
const DRILL_BUFFER_CAPACITY = 50;
const directionDeltas: Record<string, { x: number; y: number }> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 }
};

export const applyDrillMining = (world: WorldState, ticks: number): WorldState => {
  if (ticks <= 0) {
    return world;
  }

  let nextWorld = world;
  let nextEntities = world.entities;
  let nextResources = world.resources;
  let changed = false;

  const ensureWorldClone = () => {
    if (changed) {
      return;
    }

    nextEntities = { ...nextEntities };
    nextResources = { ...nextResources };
    nextWorld = {
      ...nextWorld,
      entities: nextEntities,
      resources: nextResources
    };
    changed = true;
  };

  const stepSeconds = FIXED_STEP_MS / 1000;
  const progressDelta = ticks * stepSeconds * DRILL_MINE_RATE;

  for (const entity of Object.values(nextEntities)) {
    if (entity.type !== 'drill') {
      continue;
    }

    const tileX = Math.floor(entity.position.x);
    const tileY = Math.floor(entity.position.y);
    const resource = getResourceAt(nextWorld, tileX, tileY);
    if (!resource) {
      continue;
    }

    const inventory = entity.inventory ?? null;
    const inventoryAmount = inventory?.amount ?? 0;
    if (inventoryAmount >= DRILL_BUFFER_CAPACITY) {
      continue;
    }

    const totalProgress = (entity.miningProgress ?? 0) + progressDelta;
    const produced = Math.floor(totalProgress);
    if (produced <= 0 && totalProgress === entity.miningProgress) {
      continue;
    }

    const available = Math.min(resource.amount, DRILL_BUFFER_CAPACITY - inventoryAmount);
    if (available <= 0) {
      continue;
    }

    const mined = Math.min(produced, available);
    const remainder = produced > available ? 0 : totalProgress - produced;

    if (mined === 0 && remainder === entity.miningProgress) {
      continue;
    }

    ensureWorldClone();

    let nextInventory: ItemSlot = inventory;
    for (let i = 0; i < mined; i += 1) {
      nextInventory = insertOneInto(nextInventory, 'iron_ore');
    }

    const delta = directionDeltas[entity.direction];
    if (delta && canTake(nextInventory)) {
      const outputX = tileX + delta.x;
      const outputY = tileY + delta.y;
      const target = getEntityAt(nextWorld, outputX, outputY);

      if (target && target.type === 'belt' && !target.beltItem) {
        const [remaining, taken] = takeOneFrom(nextInventory);
        if (!taken) {
          continue;
        }

        nextInventory = remaining;
        nextEntities[target.id] = {
          ...target,
          beltItem: insertOneInto(null, taken.type)
        };
      }
    }

    nextEntities[entity.id] = {
      ...entity,
      inventory: nextInventory,
      miningProgress: remainder
    };

    const key = resourceKey(tileX, tileY);
    const nextAmount = resource.amount - mined;
    if (nextAmount <= 0) {
      delete nextResources[key];
    } else {
      nextResources[key] = { ...resource, amount: nextAmount };
    }
  }

  return changed ? nextWorld : world;
};
