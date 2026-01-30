/*
Drill mining simulation.

Consumes resource tiles under drills and fills a small internal buffer over time.
*/

import type { ItemStack, WorldState } from '$lib/game/types';
import { getResourceAt, resourceKey } from '$lib/game/world/resources';

const FIXED_STEP_MS = 50;
const DRILL_MINE_RATE = 1;
const DRILL_BUFFER_CAPACITY = 50;

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

    const inventory = entity.inventory ?? { type: 'iron_ore', amount: 0 };
    if (inventory.amount >= DRILL_BUFFER_CAPACITY) {
      continue;
    }

    const totalProgress = (entity.miningProgress ?? 0) + progressDelta;
    const produced = Math.floor(totalProgress);
    if (produced <= 0 && totalProgress === entity.miningProgress) {
      continue;
    }

    const available = Math.min(resource.amount, DRILL_BUFFER_CAPACITY - inventory.amount);
    if (available <= 0) {
      continue;
    }

    const mined = Math.min(produced, available);
    const remainder = produced > available ? 0 : totalProgress - produced;

    if (mined === 0 && remainder === entity.miningProgress) {
      continue;
    }

    ensureWorldClone();

    const nextInventory: ItemStack = {
      type: inventory.type,
      amount: inventory.amount + mined
    };

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
