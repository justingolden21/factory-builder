/*
Inserter transport system tests.

Validates deterministic inserter item movement.
*/

import { describe, expect, it } from 'vitest';
import { applyInserterTransport } from '$lib/game/systems/inserterTransport';
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

describe('inserter transport', () => {
  it('moves item from belt to belt', () => {
    const world = createWorld({
      entities: {
        beltIn: {
          id: 'beltIn',
          type: 'belt',
          position: { x: 0.5, y: 0.5 },
          direction: 'east',
          beltItem: { type: 'iron_ore', amount: 1 }
        },
        inserter: {
          id: 'inserter',
          type: 'inserter',
          position: { x: 1.5, y: 0.5 },
          direction: 'east'
        },
        beltOut: {
          id: 'beltOut',
          type: 'belt',
          position: { x: 2.5, y: 0.5 },
          direction: 'east'
        }
      },
      entityTiles: {
        '0:0': 'beltIn',
        '1:0': 'inserter',
        '2:0': 'beltOut'
      }
    });

    const next = applyInserterTransport(world, 1);

    expect(next.entities['beltIn']?.beltItem).toBeNull();
    expect(next.entities['beltOut']?.beltItem?.amount).toBe(1);
  });

  it('moves item from belt to chest', () => {
    const world = createWorld({
      entities: {
        beltIn: {
          id: 'beltIn',
          type: 'belt',
          position: { x: 0.5, y: 1.5 },
          direction: 'east',
          beltItem: { type: 'iron_ore', amount: 1 }
        },
        inserter: {
          id: 'inserter',
          type: 'inserter',
          position: { x: 1.5, y: 1.5 },
          direction: 'east'
        },
        chest: {
          id: 'chest',
          type: 'chest',
          position: { x: 2.5, y: 1.5 },
          direction: 'north',
          inventory: { type: 'iron_ore', amount: 2 }
        }
      },
      entityTiles: {
        '0:1': 'beltIn',
        '1:1': 'inserter',
        '2:1': 'chest'
      }
    });

    const next = applyInserterTransport(world, 1);

    expect(next.entities['beltIn']?.beltItem).toBeNull();
    expect(next.entities['chest']?.inventory?.amount).toBe(3);
  });

  it('moves exactly one item from belt to chest', () => {
    const world = createWorld({
      entities: {
        beltIn: {
          id: 'beltIn',
          type: 'belt',
          position: { x: 0.5, y: 5.5 },
          direction: 'east',
          beltItem: { type: 'iron_ore', amount: 2 }
        },
        inserter: {
          id: 'inserter',
          type: 'inserter',
          position: { x: 1.5, y: 5.5 },
          direction: 'east'
        },
        chest: {
          id: 'chest',
          type: 'chest',
          position: { x: 2.5, y: 5.5 },
          direction: 'north',
          inventory: { type: 'iron_ore', amount: 1 }
        }
      },
      entityTiles: {
        '0:5': 'beltIn',
        '1:5': 'inserter',
        '2:5': 'chest'
      }
    });

    const next = applyInserterTransport(world, 1);

    expect(next.entities['beltIn']?.beltItem?.amount).toBe(1);
    expect(next.entities['chest']?.inventory?.amount).toBe(2);
  });

  it('does nothing when output is invalid', () => {
    const world = createWorld({
      entities: {
        beltIn: {
          id: 'beltIn',
          type: 'belt',
          position: { x: 0.5, y: 2.5 },
          direction: 'east',
          beltItem: { type: 'iron_ore', amount: 1 }
        },
        inserter: {
          id: 'inserter',
          type: 'inserter',
          position: { x: 1.5, y: 2.5 },
          direction: 'east'
        }
      },
      entityTiles: {
        '0:2': 'beltIn',
        '1:2': 'inserter'
      }
    });

    const next = applyInserterTransport(world, 1);

    expect(next).toBe(world);
  });

  it('uses deterministic ordering for conflicts', () => {
    const world = createWorld({
      entities: {
        beltA: {
          id: 'beltA',
          type: 'belt',
          position: { x: 0.5, y: 3.5 },
          direction: 'east',
          beltItem: { type: 'iron_ore', amount: 1 }
        },
        beltB: {
          id: 'beltB',
          type: 'belt',
          position: { x: 0.5, y: 4.5 },
          direction: 'east',
          beltItem: { type: 'iron_ore', amount: 1 }
        },
        inserterA: {
          id: 'inserterA',
          type: 'inserter',
          position: { x: 1.5, y: 3.5 },
          direction: 'east'
        },
        inserterB: {
          id: 'inserterB',
          type: 'inserter',
          position: { x: 1.5, y: 4.5 },
          direction: 'east'
        },
        beltOut: {
          id: 'beltOut',
          type: 'belt',
          position: { x: 2.5, y: 3.5 },
          direction: 'east'
        }
      },
      entityTiles: {
        '0:3': 'beltA',
        '0:4': 'beltB',
        '1:3': 'inserterA',
        '1:4': 'inserterB',
        '2:3': 'beltOut'
      }
    });

    const next = applyInserterTransport(world, 1);

    const itemsOnOutput = next.entities['beltOut']?.beltItem ? 1 : 0;
    const remaining = [next.entities['beltA'], next.entities['beltB']].filter(
      (entity) => entity?.beltItem
    ).length;

    expect(itemsOnOutput).toBe(1);
    expect(remaining).toBe(1);
  });
});
