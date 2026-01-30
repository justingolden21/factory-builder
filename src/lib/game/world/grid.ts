/*
World grid helpers.

Provides visible tile bounds for the current camera and viewport.
*/

import type { Camera } from '$lib/game/world/camera';

type TileBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

const PADDING_TILES = 2;

export const getVisibleTileBounds = (
  camera: Camera,
  viewportW: number,
  viewportH: number
): TileBounds => {
  const halfWidth = viewportW / camera.zoom / 2;
  const halfHeight = viewportH / camera.zoom / 2;

  return {
    minX: Math.floor(camera.x - halfWidth) - PADDING_TILES,
    maxX: Math.ceil(camera.x + halfWidth) + PADDING_TILES,
    minY: Math.floor(camera.y - halfHeight) - PADDING_TILES,
    maxY: Math.ceil(camera.y + halfHeight) + PADDING_TILES
  };
};
