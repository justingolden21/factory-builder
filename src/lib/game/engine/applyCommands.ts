/*
Command application for the game state.

Applies queued input commands to state while keeping the engine deterministic.
*/

import type { GameCommand } from '$lib/game/engine/commands';
import type { EntityState, GameState } from '$lib/game/types';
import { getResourceAt, resourceKey } from '$lib/game/world/resources';

export const applyCommands = (state: GameState, commands: GameCommand[]): GameState => {
  if (commands.length === 0) {
    return state;
  }

  let nextWorld = state.world;
  let nextMoveIntent = state.world.player.moveIntent;
  let nextEntities = state.world.entities;
  let nextBuild = state.world.build;
  let nextEntityId = state.world.nextEntityId;
  let nextResources = state.world.resources;
  let changed = false;

  const ensureWorldClone = () => {
    if (changed) {
      return;
    }

    nextBuild = { ...nextBuild };
    nextMoveIntent = { ...nextMoveIntent };
    nextEntities = { ...nextEntities };
    nextResources = { ...nextResources };
    nextWorld = {
      ...nextWorld,
      build: nextBuild,
      entities: nextEntities,
      nextEntityId,
      resources: nextResources
    };
    changed = true;
  };

  const findEntityAt = (tileX: number, tileY: number): EntityState | null => {
    for (const entity of Object.values(nextEntities)) {
      if (Math.floor(entity.position.x) === tileX && Math.floor(entity.position.y) === tileY) {
        return entity;
      }
    }

    return null;
  };

  for (const command of commands) {
    if (command.type === 'move_intent') {
      if (nextMoveIntent[command.dir] === command.isDown) {
        continue;
      }

      ensureWorldClone();
      nextMoveIntent[command.dir] = command.isDown;
    } else if (command.type === 'select_tool') {
      if (nextBuild.tool === command.tool) {
        continue;
      }

      ensureWorldClone();
      nextBuild.tool = command.tool;
    } else if (command.type === 'place_entity') {
      if (command.entityType === 'drill') {
        const resource = getResourceAt(nextWorld, command.tileX, command.tileY);
        if (!resource) {
          continue;
        }
      }

      if (findEntityAt(command.tileX, command.tileY)) {
        continue;
      }

      ensureWorldClone();
      const id = String(nextEntityId);
      const entity: EntityState = {
        id,
        type: command.entityType,
        position: { x: command.tileX + 0.5, y: command.tileY + 0.5 },
        direction: 'north'
      };
      nextEntities[id] = entity;
      nextEntityId += 1;
      nextWorld = {
        ...nextWorld,
        nextEntityId
      };
    } else if (command.type === 'remove_entity') {
      const existing = findEntityAt(command.tileX, command.tileY);
      if (!existing) {
        continue;
      }

      ensureWorldClone();
      delete nextEntities[existing.id];
    } else if (command.type === 'mine_tile') {
      const resource = getResourceAt(nextWorld, command.tileX, command.tileY);
      if (!resource) {
        continue;
      }

      const nextAmount = resource.amount - 1;
      if (nextAmount === resource.amount) {
        continue;
      }

      ensureWorldClone();
      const key = resourceKey(command.tileX, command.tileY);
      if (nextAmount <= 0) {
        delete nextResources[key];
      } else {
        nextResources[key] = { ...resource, amount: nextAmount };
      }
    }
  }

  if (!changed) {
    return state;
  }

  return {
    engine: state.engine,
    world: {
      ...nextWorld,
      player: {
        ...state.world.player,
        moveIntent: nextMoveIntent
      }
    }
  };
};
