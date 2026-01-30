/*
Inventory helpers.

Provides pure utilities for moving single items between inventories.
*/

import type { Inventory, ItemType } from '$lib/game/types';

export const takeOne = (inv: Inventory | null): [Inventory | null, Inventory | null] => {
  if (!inv || inv.amount <= 0) {
    return [inv, null];
  }

  const remaining = inv.amount > 1 ? { type: inv.type, amount: inv.amount - 1 } : null;
  return [remaining, { type: inv.type, amount: 1 }];
};

export const addOne = (inv: Inventory | null, type: ItemType): Inventory => {
  if (!inv) {
    return { type, amount: 1 };
  }

  return {
    type: inv.type,
    amount: inv.amount + 1
  };
};
