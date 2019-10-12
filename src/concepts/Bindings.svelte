<script>
  let name = "world";

  let a = 1;
  let b = 2;

  let yes = false;

  let scoops = 1;
  let flavours = ["Mint choc chip"];
  let menu = ["Cookies and cream", "Mint choc chip", "Raspberry ripple"];

  function join(flavours) {
    if (flavours.length === 1) return flavours[0];
    return `${flavours.slice(0, -1).join(", ")} and ${
      flavours[flavours.length - 1]
    }`;
  }

  let value = `Some words are *italic*, some are **bold**`;

  let questions = [
    { id: 1, text: `Where did you go to school?` },
    { id: 2, text: `What is your mother's name?` },
    {
      id: 3,
      text: `What is another personal fact that an attacker could easily find with Google?`
    }
  ];

  let selected;

  let answer = "";

  function handleSubmit() {
    alert(
      `answered question ${selected.id} (${selected.text}) with "${answer}"`
    );
  }

  let todos = [
    { done: false, text: "finish Svelte tutorial" },
    { done: false, text: "build an app" },
    { done: false, text: "world domination" }
  ];

  function add() {
    todos = todos.concat({ done: false, text: "" });
  }

  function clear() {
    todos = todos.filter(t => !t.done);
  }

  $: remaining = todos.filter(t => !t.done).length;

  import Keypad from "./nested/Keypad.svelte";

  let pin;
  $: view = pin ? pin.replace(/\d(?!$)/g, "•") : "enter your pin";

  function handlePinSubmit() {
    alert(`submitted ${pin}`);
  }
</script>

<style>
  textarea {
    width: 100%;
    height: 200px;
  }

  input {
    display: block;
    width: 500px;
    max-width: 100%;
  }

  .done {
    opacity: 0.4;
  }
</style>

<h2>Bindings</h2>
<input bind:value={name} />
<h3>Hello {name}!</h3>

<!--can coerce numeric inputs to numbers instead of strings with bind:value-->
<label>
  <input type="number" bind:value={a} min="0" max="10" />
  <input type="range" bind:value={a} min="0" max="10" />
</label>

<label>
  <input type="number" bind:value={b} min="0" max="10" />
  <input type="range" bind:value={b} min="0" max="10" />
</label>

<p>{a} + {b} = {a + b}</p>

<!--need to bind:checked instead of bind:value for checkboxes-->
<label>
  <input type="checkbox" bind:checked={yes} />
  Yes! Send me regular email spam
</label>

{#if yes}
  <p>Thank you. We will bombard your inbox and sell your personal details.</p>
{:else}
  <p>You must opt in to continue. If you're not paying, you're the product.</p>
{/if}

<button disabled={!yes}>Subscribe</button>

<!--binding example for radio buttons and checkboxes-->
<h3>Size</h3>

<label>
  <input type="radio" bind:group={scoops} value={1} />
  One scoop
</label>

<label>
  <input type="radio" bind:group={scoops} value={2} />
  Two scoops
</label>

<label>
  <input type="radio" bind:group={scoops} value={3} />
  Three scoops
</label>

<h3>Flavours</h3>
{#each menu as flavour}
  <label>
    <input type="checkbox" bind:group={flavours} value={flavour} />
    {flavour}
  </label>
{/each}

{#if flavours.length === 0}
  <p>Please select at least one flavour</p>
{:else if flavours.length > scoops}
  <p>Can't order more flavours than scoops!</p>
{:else}
  <p>
    You ordered {scoops} {scoops === 1 ? 'scoop' : 'scoops'} of {join(flavours)}
  </p>
{/if}

<!--binding example for textarea-->
<textarea bind:value />

{@html value}

<!--binding example for dropdown/select input-->
<h3>Insecurity questions</h3>

<form on:submit|preventDefault={handleSubmit}>
  <select bind:value={selected} on:change={() => (answer = '')}>
    {#each questions as question}
      <option value={question}>{question.text}</option>
    {/each}
  </select>

  <input bind:value={answer} />

  <button disabled={!answer} type="submit">Submit</button>
</form>

<p>selected question {selected ? selected.id : '[waiting...]'}</p>

<!--can also use select multiple-->
<!--<select multiple bind:value={flavours}>
	{#each menu as flavour}
		<option value={flavour}>
			{flavour}
		</option>
	{/each}
</select>-->

<!--can bind to properties inside an each block-->
<h3>Todos</h3>

{#each todos as todo}
  <div class:done={todo.done}>
    <input type="checkbox" bind:checked={todo.done} />

    <input placeholder="What needs to be done?" bind:value={todo.text} />
  </div>
{/each}

<p>{remaining} remaining</p>

<button on:click={add}>Add new</button>

<button on:click={clear}>Clear completed</button>

<!--can also bind to component props-->
<h3 style="color: {pin ? '#333' : '#ccc'}">{view}</h3>

<Keypad bind:value={pin} on:submit={handlePinSubmit} />
