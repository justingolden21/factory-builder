/*
Item transfer helpers.

Owns slot-based checks and single-item transfers for simulation systems.
*/

import type { ItemSlot, ItemType } from '$lib/game/types';
import { addOne, takeOne } from '$lib/game/world/inventory';

export const canTake = (slot: ItemSlot): boolean => {
  return !!slot && slot.amount > 0;
};

export const canInsert = (slot: ItemSlot, type: ItemType): boolean => {
  if (!slot) {
    return true;
  }

  return slot.type === type;
};

export const takeOneFrom = (slot: ItemSlot): [ItemSlot, ItemSlot] => {
  return takeOne(slot);
};

export const insertOneInto = (slot: ItemSlot, type: ItemType): ItemSlot => {
  return addOne(slot, type);
};
