/*
Engine determinism tests.

Validates fixed-step ticking and immutability guarantees for the core loop.
*/

import { describe, expect, it } from 'vitest';
import { createGame, stepGame } from '$lib/game/engine';

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach((entry) => {
      if (entry && typeof entry === 'object' && !Object.isFrozen(entry)) {
        deepFreeze(entry);
      }
    });
  }

  return value;
};

describe('engine', () => {
  it('advances deterministically with fixed timesteps', () => {
    let chunked = createGame();

    for (let i = 0; i < 10; i += 1) {
      chunked = stepGame(chunked, 10);
    }

    const single = stepGame(createGame(), 100);

    expect(chunked.world.tick).toBe(single.world.tick);
  });

  it('does not mutate input state', () => {
    const state = deepFreeze(createGame());
    const next = stepGame(state, 100);

    expect(state.world.tick).toBe(0);
    expect(next.world.tick).toBe(2);
  });
});
