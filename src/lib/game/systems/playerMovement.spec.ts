/*
Player movement system tests.

Verifies movement deltas and diagonal normalization.
*/

import { describe, expect, it } from 'vitest';
import { applyPlayerMovement } from '$lib/game/systems/playerMovement';
import type { WorldState } from '$lib/game/types';

const createWorld = (overrides: Partial<WorldState> = {}): WorldState => {
  return {
    tick: 0,
    player: {
      position: { x: 0, y: 0 },
      moveIntent: {
        up: false,
        down: false,
        left: false,
        right: false
      },
      ...overrides.player
    },
    entities: {},
    build: {
      tool: 'none'
    },
    nextEntityId: 1,
    ...overrides
  };
};

describe('player movement', () => {
  it('moves right by one tick step', () => {
    const world = createWorld({
      player: {
        position: { x: 0, y: 0 },
        moveIntent: { up: false, down: false, left: false, right: true }
      }
    });

    const next = applyPlayerMovement(world, 1);

    expect(next.player.position.x).toBeCloseTo(0.2, 5);
    expect(next.player.position.y).toBeCloseTo(0, 5);
  });

  it('normalizes diagonal movement', () => {
    const world = createWorld({
      player: {
        position: { x: 0, y: 0 },
        moveIntent: { up: true, down: false, left: false, right: true }
      }
    });

    const next = applyPlayerMovement(world, 1);
    const distance = Math.hypot(next.player.position.x, next.player.position.y);

    expect(distance).toBeCloseTo(0.2, 5);
  });
});
