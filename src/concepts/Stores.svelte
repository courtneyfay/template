<script>
  import { time, count, elapsed, name, greeting } from "./nested/stores.js";
  import Incrementer from "./nested/Incrementer.svelte";
  import Decrementer from "./nested/Decrementer.svelte";
  import Resetter from "./nested/Resetter.svelte";

  // let count_value;

  // const unsubscribe = count.subscribe(value => {
  //   count_value = value;
  // });

  const formatter = new Intl.DateTimeFormat("en", {
    hour12: true,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  });
</script>

<h2>Stores</h2>
<h3>Writable stores example</h3>
<!--can use $ to call global store variables directly and will automatically unsubscribe also-->
<h1>The count is {$count}</h1>
<button on:click={count.increment}>+</button>
<button on:click={count.decrement}>-</button>
<button on:click={count.reset}>reset</button>
<!-- <Incrementer />
<Decrementer />
<Resetter /> -->

<h3>Readable stores example</h3>
<h1>The time is {formatter.format($time)}</h1>

<h3>Derived stores</h3>
<p>
  This page has been open for {$elapsed} {$elapsed === 1 ? 'second' : 'seconds'}
</p>

<h3>Store bindings</h3>
<h4>{$greeting}</h4>
<input bind:value={$name} />

<button on:click={() => ($name += '!')}>Add exclamation mark!</button>
