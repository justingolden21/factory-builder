/*
Core game domain types.

Defines the minimal shared state and identifiers that the simulation and UI agree on.
*/

export type Vec2 = {
  x: number;
  y: number;
};

export type Direction = 'north' | 'east' | 'south' | 'west';

export type EntityId = string;

export type EntityType = 'player';

export type PlayerState = {
  position: Vec2;
};

export type EntityState = {
  id: EntityId;
  type: EntityType;
  position: Vec2;
  direction: Direction;
};

export type WorldState = {
  tick: number;
  player: PlayerState;
  entities: Record<EntityId, EntityState>;
};

export type GameState = {
  world: WorldState;
};
