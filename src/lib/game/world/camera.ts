/*
Camera model and coordinate transforms.

Defines the view-space mapping helpers used by the SVG renderer.
*/

import type { Vec2 } from '$lib/game/types';

type ScreenPoint = {
  x: number;
  y: number;
};

export type Camera = {
  x: number;
  y: number;
  zoom: number;
};

const MIN_ZOOM = 16;
const MAX_ZOOM = 96;

export const clampZoom = (zoom: number): number => {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
};

export const screenToWorld = (
  px: number,
  py: number,
  camera: Camera,
  viewportW: number,
  viewportH: number
): Vec2 => {
  return {
    x: (px - viewportW / 2) / camera.zoom + camera.x,
    y: (py - viewportH / 2) / camera.zoom + camera.y
  };
};

export const worldToScreen = (
  x: number,
  y: number,
  camera: Camera,
  viewportW: number,
  viewportH: number
): ScreenPoint => {
  return {
    x: (x - camera.x) * camera.zoom + viewportW / 2,
    y: (y - camera.y) * camera.zoom + viewportH / 2
  };
};
