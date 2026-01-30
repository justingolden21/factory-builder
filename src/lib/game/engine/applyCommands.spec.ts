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

  it('does not place inserter without valid neighbor', () => {
    const state = createGame({ world: { resources: {} } });
    const next = applyCommands(state, [
      { type: 'place_entity', entityType: 'inserter', tileX: 8, tileY: 8 }
    ]);

    expect(next).toBe(state);
  });
});
