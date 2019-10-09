<script>
  let user = { loggedIn: false };

  function toggle() {
    user.loggedIn = !user.loggedIn;
  }

  let cats = [
    { id: "J---aiyznGQ", name: "Keyboard Cat" },
    { id: "z_AbfPXTKms", name: "Maru" },
    { id: "OUtn3pvWmpg", name: "Henri The Existential Cat" }
  ];

  import Thing from "./Thing.svelte";

  let things = [
    { id: 1, color: "#0d0887" },
    { id: 2, color: "#6a00a8" },
    { id: 3, color: "#b12a90" },
    { id: 4, color: "#e16462" },
    { id: 5, color: "#fca636" }
  ];

  function handleClick() {
    things = things.slice(1);
  }

  let promise = getRandomNumber();

  async function getRandomNumber() {
    const res = await fetch(
      `https://www.random.org/integers/?num=1&min=1&max=100&col=1&base=10&format=plain&rnd=new`
    );
    console.log("res", res);
    const text = await res.text();

    if (res.ok) {
      return text;
    } else {
      throw new Error(text);
    }
  }

  function handleNumberClick() {
    promise = getRandomNumber();
  }
</script>

<h2>Logic</h2>

<!--can use conditional statements in HTML, like in Vue-->
{#if user.loggedIn}
  <button on:click={toggle}>Log out</button>
{:else}
  <button on:click={toggle}>Log in</button>
{/if}

<!--can loop over lists of data, like in Vue-->
<h3>The Famous Cats of YouTube</h3>
<ul>
  {#each cats as cat, i}
    <li>
      <a target="_blank" href="https://www.youtube.com/watch?v={cat.id}">
        {i + 1}: {cat.name}
      </a>
    </li>
  {/each}
</ul>

<!--make sure you pass in thing.id or this will not work as expected (keyed each blocks)-->
<button on:click={handleClick}>Remove first thing</button>
{#each things as thing (thing.id)}
  <Thing current={thing.color} />
{/each}

<!--can use built in #await to deal with async behavior in the html directly!-->
<button on:click={handleNumberClick}>generate random number</button>
{#await promise}
  <p>...waiting</p>
{:then number}
  <p>The number is {number}</p>
{:catch error}
  <p style="color: red">{error.message}</p>
{/await}
