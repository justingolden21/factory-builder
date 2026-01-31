/*
Camera math tests.

Ensures core coordinate conversions stay stable and clamped.
*/

import { describe, expect, it } from 'vitest';
import { clampZoom, screenToWorld, worldToScreen } from '$lib/game/world/camera';

const camera = { x: 2, y: -3, zoom: 40 };
const viewport = { width: 800, height: 600 };
const epsilon = 0.0001;

describe('camera math', () => {
  it('converts world to screen and back', () => {
    const world = { x: 5.25, y: -1.75 };
    const screen = worldToScreen(world.x, world.y, camera, viewport.width, viewport.height);
    const roundTrip = screenToWorld(screen.x, screen.y, camera, viewport.width, viewport.height);

    expect(Math.abs(roundTrip.x - world.x)).toBeLessThan(epsilon);
    expect(Math.abs(roundTrip.y - world.y)).toBeLessThan(epsilon);
  });

  it('clamps zoom to bounds', () => {
    expect(clampZoom(2)).toBeGreaterThanOrEqual(16);
    expect(clampZoom(200)).toBeLessThanOrEqual(96);
  });
});
