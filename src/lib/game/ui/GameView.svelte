<!--
Game world SVG renderer.

Owns viewport measurement and camera interactions for the bootable game view.
-->

<script lang="ts">
  import type { GameState } from '$lib/game/types';
  import type { Camera } from '$lib/game/world/camera';
  import { clampZoom, screenToWorld, worldToScreen } from '$lib/game/world/camera';
  import { getVisibleTileBounds } from '$lib/game/world/grid';

  let { game } = $props<{ game: GameState }>();

  let wrapper: HTMLDivElement | null = $state(null);
  let viewport = $state({ width: 0, height: 0 });
  let camera = $state<Camera>({ x: 0, y: 0, zoom: 48 });
  let hoverTile = $state<{ x: number; y: number } | null>(null);
  let isPanning = $state(false);
  let lastPointer = $state<{ x: number; y: number } | null>(null);

  $effect(() => {
    if (!wrapper) {
      return;
    }

    const updateSize = () => {
      const rect = wrapper?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      viewport = { width: rect.width, height: rect.height };
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(wrapper);

    return () => {
      observer.disconnect();
    };
  });

  const visibleBounds = $derived.by(() => {
    if (viewport.width === 0 || viewport.height === 0) {
      return null;
    }

    return getVisibleTileBounds(camera, viewport.width, viewport.height);
  });

  const tiles = $derived.by(() => {
    if (!visibleBounds) {
      return [] as Array<{ x: number; y: number; key: string }>;
    }

    const list: Array<{ x: number; y: number; key: string }> = [];

    for (let y = visibleBounds.minY; y <= visibleBounds.maxY; y += 1) {
      for (let x = visibleBounds.minX; x <= visibleBounds.maxX; x += 1) {
        list.push({ x, y, key: `${x}:${y}` });
      }
    }

    return list;
  });

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 2) {
      return;
    }

    event.preventDefault();
    isPanning = true;
    lastPointer = { x: event.clientX, y: event.clientY };
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!wrapper || viewport.width === 0 || viewport.height === 0) {
      return;
    }

    const rect = wrapper.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const worldPos = screenToWorld(localX, localY, camera, viewport.width, viewport.height);

    hoverTile = { x: Math.floor(worldPos.x), y: Math.floor(worldPos.y) };

    if (!isPanning || !lastPointer) {
      return;
    }

    const deltaX = event.clientX - lastPointer.x;
    const deltaY = event.clientY - lastPointer.y;
    lastPointer = { x: event.clientX, y: event.clientY };

    camera = {
      ...camera,
      x: camera.x - deltaX / camera.zoom,
      y: camera.y - deltaY / camera.zoom
    };
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (event.button !== 2) {
      return;
    }

    isPanning = false;
    lastPointer = null;
  };

  const handlePointerLeave = () => {
    hoverTile = null;
  };

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();

    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    camera = {
      ...camera,
      zoom: clampZoom(camera.zoom * zoomFactor)
    };
  };
</script>

<div
  class="h-full w-full"
  bind:this={wrapper}
  role="application"
  oncontextmenu={(event) => event.preventDefault()}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  onpointerleave={handlePointerLeave}
  onwheel={handleWheel}
>
  <svg class="block h-full w-full">
    {#if viewport.width > 0 && viewport.height > 0}
      <g>
        {#each tiles as tile (tile.key)}
          {@const topLeft = worldToScreen(tile.x, tile.y, camera, viewport.width, viewport.height)}
          <rect
            x={topLeft.x}
            y={topLeft.y}
            width={camera.zoom}
            height={camera.zoom}
            fill="none"
            stroke="rgba(148, 163, 184, 0.35)"
          />
        {/each}
      </g>

      {#if hoverTile}
        {@const hoverPos = worldToScreen(hoverTile.x, hoverTile.y, camera, viewport.width, viewport.height)}
        <rect
          x={hoverPos.x}
          y={hoverPos.y}
          width={camera.zoom}
          height={camera.zoom}
          fill="rgba(56, 189, 248, 0.12)"
          stroke="rgba(56, 189, 248, 0.6)"
        />
      {/if}

      {@const playerPos = worldToScreen(
        game.world.player.position.x,
        game.world.player.position.y,
        camera,
        viewport.width,
        viewport.height
      )}
      <circle
        cx={playerPos.x}
        cy={playerPos.y}
        r={camera.zoom * 0.25}
        fill="rgba(34, 197, 94, 0.85)"
      />
      <text
        x={playerPos.x}
        y={playerPos.y + camera.zoom * 0.12}
        text-anchor="middle"
        font-size={camera.zoom * 0.3}
        fill="white"
      >
        P
      </text>
    {/if}
  </svg>
</div>
