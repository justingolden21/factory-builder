/*
Drill mining system tests.

Covers resource depletion and drill buffer behavior.
*/

import { describe, expect, it } from 'vitest';
import { applyDrillMining } from '$lib/game/systems/drillMining';
import type { WorldState } from '$lib/game/types';
import { resourceKey } from '$lib/game/world/resources';

const createWorld = (overrides: Partial<WorldState> = {}): WorldState => {
  return {
    tick: 0,
    player: {
      position: { x: 0, y: 0 },
      moveIntent: { up: false, down: false, left: false, right: false }
    },
    entities: {},
    build: { tool: 'none' },
    nextEntityId: 1,
    resources: {},
    ...overrides
  };
};

describe('drill mining', () => {
  it('produces items after sufficient ticks', () => {
    const world = createWorld({
      entities: {
        '1': {
          id: '1',
          type: 'drill',
          position: { x: 1.5, y: 1.5 },
          direction: 'north'
        }
      },
      resources: {
        [resourceKey(1, 1)]: { type: 'iron_ore', amount: 100 }
      }
    });

    const next = applyDrillMining(world, 20);

    expect(next.entities['1']?.inventory?.amount).toBe(1);
    expect(next.resources[resourceKey(1, 1)]?.amount).toBe(99);
  });

  it('stops when resource is depleted', () => {
    const world = createWorld({
      entities: {
        '1': {
          id: '1',
          type: 'drill',
          position: { x: 2.5, y: 2.5 },
          direction: 'north'
        }
      },
      resources: {
        [resourceKey(2, 2)]: { type: 'iron_ore', amount: 1 }
      }
    });

    const next = applyDrillMining(world, 20);

    expect(next.resources[resourceKey(2, 2)]).toBeUndefined();
    expect(next.entities['1']?.inventory?.amount).toBe(1);
  });

  it('stops when buffer is full', () => {
    const world = createWorld({
      entities: {
        '1': {
          id: '1',
          type: 'drill',
          position: { x: 3.5, y: 3.5 },
          direction: 'north',
          inventory: { type: 'iron_ore', amount: 50 }
        }
      },
      resources: {
        [resourceKey(3, 3)]: { type: 'iron_ore', amount: 100 }
      }
    });

    const next = applyDrillMining(world, 20);

    expect(next).toBe(world);
  });

  it('returns same world when no drills can mine', () => {
    const world = createWorld();
    const next = applyDrillMining(world, 20);

    expect(next).toBe(world);
  });
});
