/*
Deterministic game engine core.

Owns game state creation and the fixed-timestep simulation loop.
*/

import type { GameState } from '$lib/game/types';
import { applyPlayerMovement } from '$lib/game/systems/playerMovement';

const FIXED_STEP_MS = 50;

const baseState: GameState = {
  engine: {
    accumulatorMs: 0
  },
  world: {
    tick: 0,
    player: {
      position: { x: 0, y: 0 },
      moveIntent: {
        up: false,
        down: false,
        left: false,
        right: false
      }
    },
    entities: {},
    build: {
      tool: 'none'
    },
    nextEntityId: 1
  }
};

export const createGame = (initial: Partial<GameState> = {}): GameState => {
  const engine = initial.engine ?? {};
  const world = initial.world ?? {};
  const player = world.player ?? {};
  const moveIntent = player.moveIntent ?? baseState.world.player.moveIntent;
  const build = world.build ?? baseState.world.build;

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
        },
        moveIntent: { ...moveIntent }
      },
      entities: { ...baseState.world.entities, ...(world.entities ?? {}) },
      build: {
        tool: build.tool ?? baseState.world.build.tool
      },
      nextEntityId: world.nextEntityId ?? baseState.world.nextEntityId
    }
  };
};

export const stepGame = (state: GameState, dtMs: number): GameState => {
  const safeDt = Math.max(0, dtMs);

  const nextAccumulator = state.engine.accumulatorMs + safeDt;
  const ticks = Math.floor(nextAccumulator / FIXED_STEP_MS);
  const remainder = nextAccumulator - ticks * FIXED_STEP_MS;

  if (ticks === 0) {
    if (remainder === state.engine.accumulatorMs) {
      return state;
    }

    return {
      engine: {
        accumulatorMs: remainder
      },
      world: state.world
    };
  }

  const movedWorld = applyPlayerMovement(state.world, ticks);
  const nextWorldBase = movedWorld === state.world ? state.world : movedWorld;

  return {
    engine: {
      accumulatorMs: remainder
    },
    world: {
      ...nextWorldBase,
      tick: state.world.tick + ticks,
      player: {
        ...nextWorldBase.player,
        position: { ...nextWorldBase.player.position },
        moveIntent: { ...nextWorldBase.player.moveIntent }
      },
      entities: { ...nextWorldBase.entities }
    }
  };
};
