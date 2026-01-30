/*
Game command definitions.

Defines the input command shape consumed by the simulation layer.
*/

export type GameCommand =
  | {
      type: 'move_intent';
      dir: 'up' | 'down' | 'left' | 'right';
      isDown: boolean;
    };
