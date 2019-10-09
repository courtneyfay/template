<script>
  import HelloWorld from "./components/HelloWorld.svelte";
  import Image from "./components/Image.svelte";
  import WorstParagraph from "./components/WorstParagraph.svelte";
  import RiskyHTML from "./components/RiskyHTML.svelte";
  import Concepts from "./concepts/Concepts.svelte";
</script>

<!--you can have multiple elements at the root!-->
<h1>The App</h1>
<HelloWorld name="Court" />
<Image />
<WorstParagraph />
<RiskyHTML />
<Concepts />
