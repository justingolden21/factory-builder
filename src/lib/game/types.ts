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

export type EntityType = 'belt' | 'drill' | 'chest' | 'inserter' | 'splitter';

export type PlayerState = {
  position: Vec2;
  moveIntent: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  };
};

export type BuildTool = 'none' | 'belt' | 'drill' | 'chest';

export type BuildState = {
  tool: BuildTool;
};

export type ResourceType = 'iron_ore';

export type ResourceTile = {
  type: ResourceType;
  amount: number;
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
  build: BuildState;
  nextEntityId: number;
  resources: Record<string, ResourceTile>;
};

export type EngineState = {
  accumulatorMs: number;
};

export type GameState = {
  engine: EngineState;
  world: WorldState;
};
