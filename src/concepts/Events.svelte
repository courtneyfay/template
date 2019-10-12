<script>
  let m = { x: 0, y: 0 };

  function handleMousemove(event) {
    m.x = event.clientX;
    m.y = event.clientY;
  }

  function handleButtonClick() {
    alert("no more alerts");
  }

  import Outer from "./nested/Outer.svelte";

  function handleMessage(event) {
    alert(event.detail.text);
  }

  import FancyButton from "./nested/FancyButton.svelte";

  function handleClick() {
    alert("clicked");
  }
</script>

<style>
  div {
    width: 25%;
    height: 25%;
  }
</style>

<h2>Events</h2>
<!--with click handler function-->
<div on:mousemove={handleMousemove}>The mouse position is {m.x} x {m.y}</div>
<!--with inline click handler-->
<div on:mousemove={e => (m = { x: e.clientX, y: e.clientY })}>
  The mouse position is {m.x} x {m.y}
</div>
<!--event modifiers include: preventDefault, stopPropagation, passive, capture, once, self-->
<button on:click|once={handleButtonClick}>Click me</button>
<!--nested components must forward events-->
<Outer on:message={handleMessage} />
<!--DOM events can also be forwarded-->
<FancyButton on:click={handleClick} />
