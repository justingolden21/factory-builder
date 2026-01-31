/*
Mining command tests.

Ensures manual mining reduces resources deterministically.
*/

import { describe, expect, it } from 'vitest';
import { applyCommands } from '$lib/game/engine/applyCommands';
import { createGame } from '$lib/game/engine';
import { resourceKey } from '$lib/game/world/resources';

const seedState = (amount: number) => {
  const state = createGame({
    world: {
      resources: {
        [resourceKey(1, 1)]: { type: 'iron_ore', amount }
      }
    }
  });

  return state;
};

describe('mining', () => {
  it('reduces resource amount by 1', () => {
    const state = seedState(3);
    const next = applyCommands(state, [{ type: 'mine_tile', tileX: 1, tileY: 1 }]);

    expect(next.world.resources[resourceKey(1, 1)]?.amount).toBe(2);
  });

  it('removes resource when depleted', () => {
    const state = seedState(1);
    const next = applyCommands(state, [{ type: 'mine_tile', tileX: 1, tileY: 1 }]);

    expect(next.world.resources[resourceKey(1, 1)]).toBeUndefined();
  });

  it('is a no-op when mining empty tile', () => {
    const state = createGame({ world: { resources: {} } });
    const next = applyCommands(state, [{ type: 'mine_tile', tileX: 5, tileY: 5 }]);

    expect(next).toBe(state);
  });
});
