/*
Game command definitions.

Defines the input command shape consumed by the simulation layer.
*/

import type { BuildTool, EntityType } from '$lib/game/types';

export type GameCommand =
  | {
      type: 'move_intent';
      dir: 'up' | 'down' | 'left' | 'right';
      isDown: boolean;
    }
  | {
      type: 'select_tool';
      tool: BuildTool;
    }
  | {
      type: 'place_entity';
      entityType: Exclude<EntityType, 'splitter'>;
      tileX: number;
      tileY: number;
    }
  | {
      type: 'remove_entity';
      tileX: number;
      tileY: number;
    }
  | {
      type: 'mine_tile';
      tileX: number;
      tileY: number;
    }
  | {
      type: 'rotate_entity';
      tileX: number;
      tileY: number;
    };
