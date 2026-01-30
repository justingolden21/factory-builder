/*
Game UI store and loop coordinator.

Connects the deterministic engine to the UI layer through a minimal store interface.
*/

import { applyCommands } from '$lib/game/engine/applyCommands';
import type { GameCommand } from '$lib/game/engine/commands';
import { createGame, stepGame } from '$lib/game/engine';
import type { GameState } from '$lib/game/types';

type Subscriber = (state: GameState) => void;

type GameStore = {
  getState: () => GameState;
  subscribe: (run: Subscriber) => () => void;
  dispatch: (command: GameCommand) => void;
  start: () => () => void;
  stop: () => void;
};

export const createGameStore = (): GameStore => {
  let state = createGame();
  const subscribers = new Set<Subscriber>();
  let pending: GameCommand[] = [];
  let frameId: number | null = null;
  let lastTime = 0;

  const notify = () => {
    subscribers.forEach((run) => run(state));
  };

  const update = (dtMs: number) => {
    const commands = pending;
    pending = [];

    const afterCommands = applyCommands(state, commands);
    const next = stepGame(afterCommands, dtMs);

    if (next === state) {
      return;
    }

    state = next;
    notify();
  };

  const loop = (time: number) => {
    if (lastTime === 0) {
      lastTime = time;
    }

    const dtMs = time - lastTime;
    lastTime = time;

    update(dtMs);

    frameId = requestAnimationFrame(loop);
  };

  const start = () => {
    if (frameId !== null) {
      return stop;
    }

    lastTime = 0;
    frameId = requestAnimationFrame(loop);

    return stop;
  };

  const stop = () => {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  };

  const subscribe = (run: Subscriber) => {
    subscribers.add(run);
    run(state);

    return () => {
      subscribers.delete(run);
    };
  };

  return {
    getState: () => state,
    subscribe,
    dispatch: (command) => {
      pending = [...pending, command];
    },
    start,
    stop
  };
};
