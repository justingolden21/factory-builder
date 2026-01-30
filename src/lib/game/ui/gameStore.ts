/*
Game UI store and loop coordinator.

Connects the deterministic engine to the UI layer through a minimal store interface.
*/

import { createGame, stepGame } from '$lib/game/engine';
import type { GameState } from '$lib/game/types';

type Subscriber = (state: GameState) => void;

type GameStore = {
  getState: () => GameState;
  subscribe: (run: Subscriber) => () => void;
  start: () => () => void;
  stop: () => void;
};

export const createGameStore = (): GameStore => {
  let state = createGame();
  const subscribers = new Set<Subscriber>();
  let frameId: number | null = null;
  let lastTime = 0;

  const notify = () => {
    subscribers.forEach((run) => run(state));
  };

  const update = (dtMs: number) => {
    const next = stepGame(state, dtMs);

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
    start,
    stop
  };
};
