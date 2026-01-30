/*
Command application for the game state.

Applies queued input commands to state while keeping the engine deterministic.
*/

import type { GameCommand } from '$lib/game/engine/commands';
import type { GameState } from '$lib/game/types';

export const applyCommands = (state: GameState, commands: GameCommand[]): GameState => {
  if (commands.length === 0) {
    return state;
  }

  let nextMoveIntent = state.world.player.moveIntent;
  let changed = false;

  for (const command of commands) {
    if (command.type !== 'move_intent') {
      continue;
    }

    if (nextMoveIntent[command.dir] === command.isDown) {
      continue;
    }

    if (!changed) {
      nextMoveIntent = { ...nextMoveIntent };
      changed = true;
    }

    nextMoveIntent[command.dir] = command.isDown;
  }

  if (!changed) {
    return state;
  }

  return {
    engine: state.engine,
    world: {
      ...state.world,
      player: {
        ...state.world.player,
        moveIntent: nextMoveIntent
      }
    }
  };
};
