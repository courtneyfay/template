<script>
  let current = "baz";
  let big = false;

  import { onMount } from "svelte";

  let characters = ["🥳", "🎉", "✨"];
  let toggled = false;

  function toggle() {
    toggled = !toggled;
  }

  let confetti = new Array(100).fill().map((_, i) => {
    return {
      character: characters[i % characters.length],
      x: Math.random() * 100,
      y: -20 - Math.random() * 100,
      r: 0.1 + Math.random() * 1
    };
  });
  confetti.sort((a, b) => a.r - b.r);

  onMount(() => {
    let frame;

    function loop() {
      frame = requestAnimationFrame(loop);

      confetti = confetti.map(emoji => {
        emoji.y += 0.7 * emoji.r;
        if (emoji.y > 120) emoji.y = -20;
        return emoji;
      });
    }

    loop();

    return () => cancelAnimationFrame(frame);
  });
</script>

<style>
  button {
    display: block;
  }

  .active {
    background-color: #ff3e00;
    color: white;
  }

  .big {
    font-size: 4em;
  }

  div {
    position: absolute;
    top: -5000px;
    font-size: 5vw;
  }
</style>

<h2>Classes</h2>
<button
  class={current === 'bar' ? 'active' : ''}
  on:click={() => (current = 'bar')}>
  bar
</button>

<!--there's a shorthand syntax for dynamic classes-->
<button class:active={current === 'baz'} on:click={() => (current = 'baz')}>
  baz
</button>

<!--there's also a super-shorthand syntax-->
<label>
  <input type="checkbox" bind:checked={big} />
  big
</label>

<div class:big>some {big ? 'big' : 'small'} text</div>

<h2>Debugging</h2>
<div>Can use @debug to debug in the browser</div>

<h2>Animations, Motions, Transitions</h2>
{#if toggled}
  <button on:click={toggle}>Turn off</button>
{:else}
  <button on:click={toggle}>Turn on confetti</button>
{/if}
{#if toggled}
  {#each confetti as c}
    <div style="left: {c.x}%; top: {c.y}%; transform: scale({c.r})">
      {c.character}
    </div>
  {/each}
{/if}
