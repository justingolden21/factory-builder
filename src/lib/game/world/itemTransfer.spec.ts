/*
Item transfer helper tests.

Ensures helper functions remain pure and deterministic.
*/

import { describe, expect, it } from 'vitest';
import { insertOneInto, takeOneFrom } from '$lib/game/world/itemTransfer';

describe('itemTransfer', () => {
  it('does not mutate input slots', () => {
    const slot = { type: 'iron_ore', amount: 2 };

    const [remaining, taken] = takeOneFrom(slot);
    const inserted = insertOneInto(slot, 'iron_ore');

    expect(slot.amount).toBe(2);
    expect(remaining).not.toBe(slot);
    expect(taken?.amount).toBe(1);
    expect(inserted).not.toBe(slot);
    expect(inserted?.amount).toBe(3);
  });
});
