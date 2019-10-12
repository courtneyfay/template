<script>
  import { onMount } from "svelte";

  let photos = [];

  //recommended to put fetch in onMount
  onMount(async () => {
    const res = await fetch(
      `https://jsonplaceholder.typicode.com/photos?_limit=20`
    );
    photos = await res.json();
  });

  import { onDestroy } from "svelte";

  let seconds = 0;
  const interval = setInterval(() => (seconds += 1), 1000);

  onDestroy(() => clearInterval(interval));
</script>

<style>
  .photos {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    grid-gap: 8px;
  }

  figure,
  img {
    width: 100%;
    margin: 0;
  }
</style>

<h2>On Mount</h2>
<div>Runs after the component is first rendered in the DOM</div>
<h1>Photo album</h1>

<div class="photos">
  {#each photos as photo}
    <figure>
      <img src={photo.thumbnailUrl} alt={photo.title} />
      <figcaption>{photo.title}</figcaption>
    </figure>
  {:else}
    <!-- this block renders when photos.length === 0 -->
    <p>loading...</p>
  {/each}
</div>

<h2>On Destroy</h2>
<div>Runs when component is destroyed</div>

<p>
  The page has been open for {seconds} {seconds === 1 ? 'second' : 'seconds'}
</p>

<h2>Before Update & After Update</h2>
<div>
  Before Update runs immediately before the DOM is updated - don't forget to
  check to make sure the DOM element exists!
</div>
<div>After Update runs once the DOM has been updated with the new data</div>
