/*
Tile index tests.

Validates tile key generation and entity lookup helpers.
*/

import { describe, expect, it } from 'vitest';
import { getEntityAt, tileKey } from '$lib/game/world/tiles';
import type { WorldState } from '$lib/game/types';

const createWorld = (overrides: Partial<WorldState> = {}): WorldState => {
  return {
    tick: 0,
    player: {
      position: { x: 0, y: 0 },
      moveIntent: { up: false, down: false, left: false, right: false }
    },
    entities: {},
    entityTiles: {},
    build: { tool: 'none' },
    nextEntityId: 1,
    resources: {},
    ...overrides
  };
};

describe('tiles', () => {
  it('formats tile keys', () => {
    expect(tileKey(2, -3)).toBe('2:-3');
  });

  it('returns entity from entityTiles', () => {
    const world = createWorld({
      entities: {
        a: {
          id: 'a',
          type: 'belt',
          position: { x: 1.5, y: 2.5 },
          direction: 'north'
        }
      },
      entityTiles: {
        '1:2': 'a'
      }
    });

    const entity = getEntityAt(world, 1, 2);

    expect(entity?.id).toBe('a');
  });
});
