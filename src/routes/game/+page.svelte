<!--
Game boot status page.

Displays the engine status and current tick for the minimal game loop.
-->

<script lang="ts">
  import { createGameStore } from '$lib/game/ui/gameStore';
  import type { GameState } from '$lib/game/types';

  const gameStore = createGameStore();

  let game = $state<GameState>(gameStore.getState());

  $effect(() => {
    const unsubscribe = gameStore.subscribe((next) => {
      game = next;
    });

    return () => {
      unsubscribe();
    };
  });

  $effect(() => {
    const stop = gameStore.start();

    return () => {
      stop();
    };
  });
</script>

<h1>Game boot OK</h1>
<p>Tick: {game.world.tick}</p>
