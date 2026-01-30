<!--
Game world SVG renderer.

Owns viewport measurement and camera interactions for the bootable game view.
-->

<script lang="ts">
  import type { GameCommand } from '$lib/game/engine/commands';
  import type { GameState } from '$lib/game/types';
  import type { Camera } from '$lib/game/world/camera';
  import { clampZoom, screenToWorld, worldToScreen } from '$lib/game/world/camera';
  import { getVisibleTileBounds } from '$lib/game/world/grid';
  import { resourceKey } from '$lib/game/world/resources';

  let { game, dispatch } = $props<{ game: GameState; dispatch: (command: GameCommand) => void }>();

  const tools = ['none', 'belt', 'drill', 'chest', 'inserter'] as const;

  let wrapper: HTMLDivElement | null = $state(null);
  let viewport = $state({ width: 0, height: 0 });
  let camera = $state<Camera>({ x: 0, y: 0, zoom: 48 });
  let hoverTile = $state<{ x: number; y: number } | null>(null);
  let hoverScreen = $state<{ x: number; y: number } | null>(null);
  let isPanning = $state(false);
  let rightPointerStart = $state<{ x: number; y: number } | null>(null);
  let lastPointer = $state<{ x: number; y: number } | null>(null);
  let panMoved = $state(false);

  $effect(() => {
    if (!wrapper) {
      return;
    }

    wrapper.focus({ preventScroll: true });

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

  const hoveredEntity = $derived.by(() => {
    if (!hoverTile) {
      return null;
    }

    const id = game.world.entityTiles[`${hoverTile.x}:${hoverTile.y}`];
    return id ? game.world.entities[id] ?? null : null;
  });

  const hoveredChest = $derived.by(() => {
    if (!hoveredEntity || hoveredEntity.type !== 'chest') {
      return null;
    }

    return hoveredEntity;
  });

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 2) {
      return;
    }

    event.preventDefault();
    isPanning = false;
    panMoved = false;
    rightPointerStart = { x: event.clientX, y: event.clientY };
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
    hoverScreen = { x: localX, y: localY };

    if (!rightPointerStart || !lastPointer) {
      return;
    }

    const deltaX = event.clientX - lastPointer.x;
    const deltaY = event.clientY - lastPointer.y;
    lastPointer = { x: event.clientX, y: event.clientY };

    if (!panMoved && rightPointerStart) {
      const distance = Math.hypot(event.clientX - rightPointerStart.x, event.clientY - rightPointerStart.y);
      if (distance >= 4) {
        panMoved = true;
        isPanning = true;
      }
    }

    if (!isPanning) {
      return;
    }

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

    if (!panMoved && hoverTile) {
      dispatch({ type: 'remove_entity', tileX: hoverTile.x, tileY: hoverTile.y });
    }

    isPanning = false;
    panMoved = false;
    rightPointerStart = null;
    lastPointer = null;
  };

  const handlePointerLeave = () => {
    hoverTile = null;
    hoverScreen = null;
    isPanning = false;
    panMoved = false;
    rightPointerStart = null;
    lastPointer = null;
  };

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();

    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    camera = {
      ...camera,
      zoom: clampZoom(camera.zoom * zoomFactor)
    };
  };

  const handleLeftClick = (event: PointerEvent) => {
    if (event.button !== 0 || !hoverTile) {
      return;
    }

    const tool = game.world.build.tool;
    const existing = (() => {
      const id = game.world.entityTiles[`${hoverTile.x}:${hoverTile.y}`];
      return id ? game.world.entities[id] ?? null : null;
    })();
    const carriedItem = game.world.player.inventory.slot;

    if (tool === 'none') {
      if (!carriedItem && existing) {
        event.preventDefault();
        dispatch({ type: 'pickup_from_tile', tileX: hoverTile.x, tileY: hoverTile.y });
        return;
      }

      if (carriedItem && existing) {
        event.preventDefault();
        dispatch({ type: 'drop_to_tile', tileX: hoverTile.x, tileY: hoverTile.y });
        return;
      }

      const key = resourceKey(hoverTile.x, hoverTile.y);
      if (game.world.resources[key]) {
        event.preventDefault();
        dispatch({ type: 'mine_tile', tileX: hoverTile.x, tileY: hoverTile.y });
      }

      return;
    }

    if (tool === 'belt') {
      if (existing?.type === 'belt') {
        event.preventDefault();
        dispatch({ type: 'rotate_entity', tileX: hoverTile.x, tileY: hoverTile.y });
        return;
      }
    }

    if (tool === 'inserter') {
      if (existing?.type === 'inserter') {
        event.preventDefault();
        dispatch({ type: 'rotate_entity', tileX: hoverTile.x, tileY: hoverTile.y });
        return;
      }
    }

    event.preventDefault();
    dispatch({ type: 'place_entity', entityType: tool, tileX: hoverTile.x, tileY: hoverTile.y });
  };

  const handleKey = (event: KeyboardEvent, isDown: boolean) => {
    const key = event.key.toLowerCase();
    const dir =
      key === 'w' || key === 'arrowup'
        ? 'up'
        : key === 's' || key === 'arrowdown'
          ? 'down'
          : key === 'a' || key === 'arrowleft'
            ? 'left'
            : key === 'd' || key === 'arrowright'
              ? 'right'
              : null;

    if (!dir) {
      return;
    }

    if (isDown && event.repeat) {
      return;
    }

    event.preventDefault();
    dispatch({ type: 'move_intent', dir, isDown });
  };
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="relative h-full w-full"
  bind:this={wrapper}
  role="application"
  tabindex="0"
  aria-label="Game view"
  oncontextmenu={(event) => event.preventDefault()}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={(event) => {
    handlePointerUp(event);
    handleLeftClick(event);
  }}
  onpointerleave={handlePointerLeave}
  onwheel={handleWheel}
  onkeydown={(event) => handleKey(event, true)}
  onkeyup={(event) => handleKey(event, false)}
>
  <div class="absolute left-3 top-3 z-10 flex gap-2 rounded border border-slate-700/60 bg-slate-900/70 p-2 text-xs text-slate-100">
    {#each tools as tool}
      <button
        class={`rounded px-2 py-1 ${game.world.build.tool === tool ? 'bg-slate-200 text-slate-900' : 'bg-slate-800/70'}`}
        onclick={() => dispatch({ type: 'select_tool', tool })}
      >
        {tool}
      </button>
    {/each}
  </div>
  <div class="absolute right-3 top-3 z-10 rounded border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-xs text-slate-100">
    Player Inventory:
    {#if game.world.player.inventory.slot}
      io x{game.world.player.inventory.slot.amount}
    {:else}
      empty
    {/if}
  </div>
  {#if hoveredChest && hoverScreen}
    {@const chestAmount = hoveredChest.inventory?.amount ?? 0}
    <div
      class="pointer-events-none absolute z-20 rounded border border-slate-700/60 bg-slate-900/80 px-2 py-1 text-xs text-slate-100"
      style={`left: ${hoverScreen.x + 12}px; top: ${hoverScreen.y + 12}px;`}
    >
      {chestAmount > 0 ? `Chest: io x${chestAmount}` : 'Chest: empty'}
    </div>
  {/if}
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

      {@const playerPos = worldToScreen(
        game.world.player.position.x,
        game.world.player.position.y,
        camera,
        viewport.width,
        viewport.height
      )}
      {#each Object.entries(game.world.resources) as [key, resource] (key)}
        {@const parts = key.split(':')}
        {@const tileX = Number(parts[0])}
        {@const tileY = Number(parts[1])}
        {@const resourcePos = worldToScreen(tileX + 0.5, tileY + 0.5, camera, viewport.width, viewport.height)}
        {@const resourceSize = camera.zoom * 0.6}
        {@const resourceOpacity = Math.max(0.2, Math.min(1, resource.amount / 100))}
        <circle
          cx={resourcePos.x}
          cy={resourcePos.y}
          r={resourceSize / 2}
          fill={`rgba(71, 85, 105, ${resourceOpacity})`}
          stroke="rgba(148, 163, 184, 0.7)"
        />
        <text
          x={resourcePos.x}
          y={resourcePos.y + resourceSize * 0.15}
          text-anchor="middle"
          font-size={resourceSize * 0.35}
          fill="white"
        >
          io
        </text>
      {/each}
      {#each Object.values(game.world.entities) as entity (entity.id)}
        {@const entityPos = worldToScreen(
          entity.position.x,
          entity.position.y,
          camera,
          viewport.width,
          viewport.height
        )}
        {@const entitySize = camera.zoom * 0.8}
        {@const isBelt = entity.type === 'belt'}
        {@const isChest = entity.type === 'chest'}
        {@const hasItem = isBelt ? !!entity.beltItem : isChest ? (entity.inventory?.amount ?? 0) > 0 : true}
        {@const fillOpacity = hasItem ? 0.8 : 0.5}
        <rect
          x={entityPos.x - entitySize / 2}
          y={entityPos.y - entitySize / 2}
          width={entitySize}
          height={entitySize}
          fill={`rgba(15, 23, 42, ${fillOpacity})`}
          stroke="rgba(148, 163, 184, 0.6)"
        />
        <text
          x={entityPos.x}
          y={entityPos.y + entitySize * 0.2}
          text-anchor="middle"
          font-size={entitySize * 0.4}
          fill="white"
        >
          {entity.type === 'belt'
            ? 'b'
            : entity.type === 'drill'
              ? 'd'
              : entity.type === 'inserter'
                ? 'i'
                : 'c'}
        </text>
        {#if entity.type === 'belt' || entity.type === 'inserter'}
          {@const arrowSize = entitySize * 0.24}
          {@const arrowPoints =
            entity.direction === 'north'
              ? `${entityPos.x},${entityPos.y - arrowSize} ${entityPos.x - arrowSize * 0.6},${entityPos.y + arrowSize * 0.4} ${entityPos.x + arrowSize * 0.6},${entityPos.y + arrowSize * 0.4}`
              : entity.direction === 'east'
                ? `${entityPos.x + arrowSize},${entityPos.y} ${entityPos.x - arrowSize * 0.4},${entityPos.y - arrowSize * 0.6} ${entityPos.x - arrowSize * 0.4},${entityPos.y + arrowSize * 0.6}`
                : entity.direction === 'south'
                  ? `${entityPos.x},${entityPos.y + arrowSize} ${entityPos.x - arrowSize * 0.6},${entityPos.y - arrowSize * 0.4} ${entityPos.x + arrowSize * 0.6},${entityPos.y - arrowSize * 0.4}`
                  : `${entityPos.x - arrowSize},${entityPos.y} ${entityPos.x + arrowSize * 0.4},${entityPos.y - arrowSize * 0.6} ${entityPos.x + arrowSize * 0.4},${entityPos.y + arrowSize * 0.6}`}
          <polygon points={arrowPoints} fill="rgba(226, 232, 240, 0.8)" />
          {#if entity.beltItem}
            <circle cx={entityPos.x} cy={entityPos.y} r={entitySize * 0.18} fill="rgba(226, 232, 240, 0.9)" />
            <text
              x={entityPos.x}
              y={entityPos.y + entitySize * 0.08}
              text-anchor="middle"
              font-size={entitySize * 0.18}
              fill="rgba(15, 23, 42, 0.9)"
            >
              io
            </text>
          {/if}
        {/if}
        {#if entity.type === 'drill'}
          <text
            x={entityPos.x}
            y={entityPos.y + entitySize * 0.48}
            text-anchor="middle"
            font-size={entitySize * 0.22}
            fill="rgba(226, 232, 240, 0.9)"
          >
            io: {entity.inventory?.amount ?? 0}
          </text>
        {/if}
        {#if entity.type === 'chest'}
          <text
            x={entityPos.x}
            y={entityPos.y + entitySize * 0.48}
            text-anchor="middle"
            font-size={entitySize * 0.22}
            fill="rgba(226, 232, 240, 0.9)"
          >
            io: {entity.inventory?.amount ?? 0}
          </text>
        {/if}
      {/each}
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
      {#if game.world.player.inventory.slot}
        <circle
          cx={playerPos.x + camera.zoom * 0.22}
          cy={playerPos.y - camera.zoom * 0.22}
          r={camera.zoom * 0.12}
          fill="rgba(226, 232, 240, 0.9)"
        />
        <text
          x={playerPos.x + camera.zoom * 0.22}
          y={playerPos.y - camera.zoom * 0.18}
          text-anchor="middle"
          font-size={camera.zoom * 0.16}
          fill="rgba(15, 23, 42, 0.9)"
        >
          io
        </text>
      {/if}
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
    {/if}
  </svg>
</div>
