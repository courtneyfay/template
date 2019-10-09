<script>
  import Nested from "./Nested.svelte";
</script>

<style>
  /*styles are scoped to the component*/
  p {
    color: purple;
    font-family: "Comic Sans MS";
    font-size: 2em;
  }
</style>

<p>This is the worst paragraph.</p>
<Nested />
