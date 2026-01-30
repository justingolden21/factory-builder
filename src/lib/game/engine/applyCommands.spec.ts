/*
Command application tests.

Ensures build selection and placement behave deterministically.
*/

import { describe, expect, it } from 'vitest';
import { applyCommands } from '$lib/game/engine/applyCommands';
import type { GameCommand } from '$lib/game/engine/commands';
import { createGame } from '$lib/game/engine';

const runCommands = (commands: GameCommand[]) => applyCommands(createGame(), commands);

describe('applyCommands', () => {
  it('updates selected tool', () => {
    const next = runCommands([{ type: 'select_tool', tool: 'belt' }]);

    expect(next.world.build.tool).toBe('belt');
  });

  it('places entity and increments nextEntityId', () => {
    const next = runCommands([
      { type: 'place_entity', entityType: 'chest', tileX: 2, tileY: 3 }
    ]);

    expect(Object.keys(next.world.entities)).toHaveLength(1);
    expect(next.world.nextEntityId).toBe(2);
  });

  it('does not place on occupied tile', () => {
    const state = runCommands([
      { type: 'place_entity', entityType: 'belt', tileX: 1, tileY: 1 }
    ]);
    const next = applyCommands(state, [
      { type: 'place_entity', entityType: 'belt', tileX: 1, tileY: 1 }
    ]);

    expect(next).toBe(state);
    expect(state.world.entityTiles['1:1']).toBeDefined();
    expect(Object.keys(next.world.entities)).toHaveLength(1);
  });

  it('removes entity on tile', () => {
    const state = runCommands([
      { type: 'place_entity', entityType: 'belt', tileX: 0, tileY: 0 }
    ]);
    const next = applyCommands(state, [{ type: 'remove_entity', tileX: 0, tileY: 0 }]);

    expect(Object.keys(next.world.entities)).toHaveLength(0);
  });

  it('returns same state when no effective change', () => {
    const state = createGame();
    const next = applyCommands(state, [{ type: 'select_tool', tool: 'none' }]);

    expect(next).toBe(state);
  });

  it('updates entityTiles on place and remove', () => {
    const placed = applyCommands(createGame(), [
      { type: 'place_entity', entityType: 'belt', tileX: 3, tileY: 3 }
    ]);

    expect(placed.world.entityTiles['3:3']).toBeDefined();

    const removed = applyCommands(placed, [{ type: 'remove_entity', tileX: 3, tileY: 3 }]);

    expect(removed.world.entityTiles['3:3']).toBeUndefined();
  });

  it('does not place inserter without valid neighbor', () => {
    const state = createGame({ world: { resources: {} } });
    const next = applyCommands(state, [
      { type: 'place_entity', entityType: 'inserter', tileX: 8, tileY: 8 }
    ]);

    expect(next).toBe(state);
  });

  it('picks up from belt into player inventory', () => {
    const state = createGame({
      world: {
        entities: {
          belt: {
            id: 'belt',
            type: 'belt',
            position: { x: 1.5, y: 1.5 },
            direction: 'east',
            beltItem: { type: 'iron_ore', amount: 1 }
          }
        },
        entityTiles: {
          '1:1': 'belt'
        }
      }
    });

    const next = applyCommands(state, [{ type: 'pickup_from_tile', tileX: 1, tileY: 1 }]);

    expect(next.world.player.inventory.item?.amount).toBe(1);
    expect(next.world.entities['belt']?.beltItem).toBeNull();
  });

  it('drops into chest from player inventory', () => {
    const state = createGame({
      world: {
        player: {
          inventory: { item: { type: 'iron_ore', amount: 1 } }
        },
        entities: {
          chest: {
            id: 'chest',
            type: 'chest',
            position: { x: 2.5, y: 2.5 },
            direction: 'north',
            inventory: { type: 'iron_ore', amount: 2 }
          }
        },
        entityTiles: {
          '2:2': 'chest'
        }
      }
    });

    const next = applyCommands(state, [{ type: 'drop_to_tile', tileX: 2, tileY: 2 }]);

    expect(next.world.player.inventory.item).toBeNull();
    expect(next.world.entities['chest']?.inventory?.amount).toBe(3);
  });

  it('no-ops pickup when inventory is full', () => {
    const state = createGame({
      world: {
        player: {
          inventory: { item: { type: 'iron_ore', amount: 1 } }
        },
        entities: {
          belt: {
            id: 'belt',
            type: 'belt',
            position: { x: 4.5, y: 4.5 },
            direction: 'east',
            beltItem: { type: 'iron_ore', amount: 1 }
          }
        },
        entityTiles: {
          '4:4': 'belt'
        }
      }
    });

    const next = applyCommands(state, [{ type: 'pickup_from_tile', tileX: 4, tileY: 4 }]);

    expect(next).toBe(state);
  });
});
