/*
Deterministic game engine core.

Owns game state creation and the fixed-timestep simulation loop.
*/

import type { GameState } from '$lib/game/types';

const FIXED_STEP_MS = 50;

const baseState: GameState = {
  engine: {
    accumulatorMs: 0
  },
  world: {
    tick: 0,
    player: {
      position: { x: 0, y: 0 }
    },
    entities: {}
  }
};

export const createGame = (initial: Partial<GameState> = {}): GameState => {
  const engine = initial.engine ?? {};
  const world = initial.world ?? {};
  const player = world.player ?? {};

  return {
    engine: {
      accumulatorMs: engine.accumulatorMs ?? baseState.engine.accumulatorMs
    },
    world: {
      tick: world.tick ?? baseState.world.tick,
      player: {
        position: {
          x: player.position?.x ?? baseState.world.player.position.x,
          y: player.position?.y ?? baseState.world.player.position.y
        }
      },
      entities: { ...baseState.world.entities, ...(world.entities ?? {}) }
    }
  };
};

export const stepGame = (state: GameState, dtMs: number): GameState => {
  const safeDt = Math.max(0, dtMs);

  let accumulatorMs = state.engine.accumulatorMs + safeDt;

  let ticks = 0;
  while (accumulatorMs >= FIXED_STEP_MS) {
    accumulatorMs -= FIXED_STEP_MS;
    ticks += 1;
  }

  if (ticks === 0) {
    if (accumulatorMs === state.engine.accumulatorMs) {
      return state;
    }

    return {
      engine: {
        accumulatorMs
      },
      world: state.world
    };
  }

  return {
    engine: {
      accumulatorMs
    },
    world: {
      tick: state.world.tick + ticks,
      player: {
        position: { ...state.world.player.position }
      },
      entities: { ...state.world.entities }
    }
  };
};
