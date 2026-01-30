/*
Player movement simulation.

Applies movement intent to the player position during fixed-step ticks.
*/

import type { WorldState } from '$lib/game/types';

const FIXED_STEP_MS = 50;
const SPEED_TILES_PER_SECOND = 4;

export const applyPlayerMovement = (world: WorldState, ticks: number): WorldState => {
  if (ticks <= 0) {
    return world;
  }

  const { moveIntent } = world.player;
  const inputX = (moveIntent.right ? 1 : 0) - (moveIntent.left ? 1 : 0);
  const inputY = (moveIntent.down ? 1 : 0) - (moveIntent.up ? 1 : 0);

  if (inputX === 0 && inputY === 0) {
    return world;
  }

  const length = Math.hypot(inputX, inputY);
  const stepSeconds = FIXED_STEP_MS / 1000;
  const distance = SPEED_TILES_PER_SECOND * stepSeconds * ticks;
  const deltaX = (inputX / length) * distance;
  const deltaY = (inputY / length) * distance;

  if (deltaX === 0 && deltaY === 0) {
    return world;
  }

  return {
    ...world,
    player: {
      ...world.player,
      position: {
        x: world.player.position.x + deltaX,
        y: world.player.position.y + deltaY
      }
    }
  };
};
