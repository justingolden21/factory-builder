/*
Command application for the game state.

Applies queued input commands to state while keeping the engine deterministic.
*/

import type { GameCommand } from '$lib/game/engine/commands';
import type { EntityState, GameState } from '$lib/game/types';
import { getResourceAt, resourceKey } from '$lib/game/world/resources';
import { canInsert, canTake, insertOneInto, takeOneFrom } from '$lib/game/world/itemTransfer';
import { getEntityAt, tileKey, tileOfEntity } from '$lib/game/world/tiles';

export const applyCommands = (state: GameState, commands: GameCommand[]): GameState => {
  if (commands.length === 0) {
    return state;
  }

  let nextWorld = state.world;
  let nextMoveIntent = state.world.player.moveIntent;
  let nextEntities = state.world.entities;
  let nextEntityTiles = state.world.entityTiles;
  let nextPlayer = state.world.player;
  let nextPlayerInventory = state.world.player.inventory;
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
    nextEntityTiles = { ...nextEntityTiles };
    nextResources = { ...nextResources };
    nextPlayerInventory = { ...nextPlayerInventory };
    nextPlayer = {
      ...nextPlayer,
      moveIntent: nextMoveIntent,
      inventory: nextPlayerInventory
    };
    nextWorld = {
      ...nextWorld,
      build: nextBuild,
      entities: nextEntities,
      entityTiles: nextEntityTiles,
      player: nextPlayer,
      nextEntityId,
      resources: nextResources
    };
    changed = true;
  };

  const findEntityAt = (tileX: number, tileY: number): EntityState | null => {
    const id = nextEntityTiles[tileKey(tileX, tileY)];
    return id ? nextEntities[id] ?? null : null;
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

      if (command.entityType === 'inserter') {
        const neighbors = [
          getEntityAt(nextWorld, command.tileX, command.tileY - 1),
          getEntityAt(nextWorld, command.tileX + 1, command.tileY),
          getEntityAt(nextWorld, command.tileX, command.tileY + 1),
          getEntityAt(nextWorld, command.tileX - 1, command.tileY)
        ];
        const hasValidNeighbor = neighbors.some(
          (neighbor) => neighbor?.type === 'belt' || neighbor?.type === 'chest'
        );

        if (!hasValidNeighbor) {
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
      nextEntityTiles[tileKey(command.tileX, command.tileY)] = id;
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
      const tile = tileOfEntity(existing);
      delete nextEntityTiles[tileKey(tile.x, tile.y)];
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
    } else if (command.type === 'rotate_entity') {
      const entity = findEntityAt(command.tileX, command.tileY);
      if (!entity || (entity.type !== 'belt' && entity.type !== 'inserter' && entity.type !== 'drill')) {
        continue;
      }

      const nextDirection =
        entity.direction === 'north'
          ? 'east'
          : entity.direction === 'east'
            ? 'south'
            : entity.direction === 'south'
              ? 'west'
              : 'north';

      if (nextDirection === entity.direction) {
        continue;
      }

      ensureWorldClone();
      nextEntities[entity.id] = {
        ...entity,
        direction: nextDirection
      };
    } else if (command.type === 'pickup_from_tile') {
      if (nextPlayerInventory.slot) {
        continue;
      }

      const entity = getEntityAt(nextWorld, command.tileX, command.tileY);
      if (!entity) {
        continue;
      }

      if (entity.type === 'chest') {
        if (!canTake(entity.inventory ?? null)) {
          continue;
        }

        const [remaining, taken] = takeOneFrom(entity.inventory ?? null);
        if (!taken) {
          continue;
        }

        ensureWorldClone();
        nextPlayerInventory.slot = taken;
        nextEntities[entity.id] = {
          ...entity,
          inventory: remaining
        };
      } else if (entity.type === 'belt') {
        if (!canTake(entity.beltItem ?? null)) {
          continue;
        }

        const [remaining, taken] = takeOneFrom(entity.beltItem ?? null);
        if (!taken) {
          continue;
        }

        ensureWorldClone();
        nextPlayerInventory.slot = taken;
        nextEntities[entity.id] = {
          ...entity,
          beltItem: remaining
        };
      }
    } else if (command.type === 'drop_to_tile') {
      const carried = nextPlayerInventory.slot;
      if (!carried) {
        continue;
      }

      const entity = getEntityAt(nextWorld, command.tileX, command.tileY);
      if (!entity) {
        continue;
      }

      if (entity.type === 'chest') {
        const existing = entity.inventory;
        if (!canInsert(existing ?? null, carried.type)) {
          continue;
        }

        ensureWorldClone();
        const nextInventory = insertOneInto(existing ?? null, carried.type);
        nextEntities[entity.id] = {
          ...entity,
          inventory: nextInventory
        };
        nextPlayerInventory.slot = null;
      } else if (entity.type === 'belt' && !entity.beltItem) {
        ensureWorldClone();
        nextEntities[entity.id] = {
          ...entity,
          beltItem: insertOneInto(null, carried.type)
        };
        nextPlayerInventory.slot = null;
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
      player: nextPlayer
    }
  };
};
