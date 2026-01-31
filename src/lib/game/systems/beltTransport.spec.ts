/*
Belt transport system tests.

Validates deterministic belt item movement.
*/

import { describe, expect, it } from 'vitest';
import { applyBeltTransport } from '$lib/game/systems/beltTransport';
import type { WorldState } from '$lib/game/types';

const createWorld = (overrides: Partial<WorldState> = {}): WorldState => {
  return {
    tick: 0,
    player: {
      position: { x: 0, y: 0 },
      moveIntent: { up: false, down: false, left: false, right: false },
      inventory: { slot: null }
    },
    entities: {},
    entityTiles: {},
    build: { tool: 'none' },
    nextEntityId: 1,
    resources: {},
    ...overrides
  };
};

describe('belt transport', () => {
  it('moves item forward one tile per tick', () => {
    const world = createWorld({
      entities: {
        a: {
          id: 'a',
          type: 'belt',
          position: { x: 0.5, y: 0.5 },
          direction: 'east',
          beltItem: { type: 'iron_ore', amount: 1 }
        },
        b: {
          id: 'b',
          type: 'belt',
          position: { x: 1.5, y: 0.5 },
          direction: 'east'
        }
      },
      entityTiles: {
        '0:0': 'a',
        '1:0': 'b'
      }
    });

    const next = applyBeltTransport(world, 1);

    expect(next.entities['a']?.beltItem).toBeNull();
    expect(next.entities['b']?.beltItem?.amount).toBe(1);
  });

  it('does not move when target occupied', () => {
    const world = createWorld({
      entities: {
        a: {
          id: 'a',
          type: 'belt',
          position: { x: 0.5, y: 0.5 },
          direction: 'east',
          beltItem: { type: 'iron_ore', amount: 1 }
        },
        b: {
          id: 'b',
          type: 'belt',
          position: { x: 1.5, y: 0.5 },
          direction: 'east',
          beltItem: { type: 'iron_ore', amount: 1 }
        }
      },
      entityTiles: {
        '0:0': 'a',
        '1:0': 'b'
      }
    });

    const next = applyBeltTransport(world, 1);

    expect(next).toBe(world);
  });

  it('uses deterministic ordering for conflicts', () => {
    const world = createWorld({
      entities: {
        a: {
          id: 'a',
          type: 'belt',
          position: { x: 0.5, y: 0.5 },
          direction: 'east',
          beltItem: { type: 'iron_ore', amount: 1 }
        },
        b: {
          id: 'b',
          type: 'belt',
          position: { x: 0.5, y: 1.5 },
          direction: 'north',
          beltItem: { type: 'iron_ore', amount: 1 }
        },
        c: {
          id: 'c',
          type: 'belt',
          position: { x: 1.5, y: 0.5 },
          direction: 'east'
        }
      },
      entityTiles: {
        '0:0': 'a',
        '0:1': 'b',
        '1:0': 'c'
      }
    });

    const next = applyBeltTransport(world, 1);

    const itemsOnC = next.entities['c']?.beltItem ? 1 : 0;
    const itemsRemaining = [next.entities['a'], next.entities['b']].filter(
      (entity) => entity?.beltItem
    ).length;

    expect(itemsOnC).toBe(1);
    expect(itemsRemaining).toBe(1);
  });
});
