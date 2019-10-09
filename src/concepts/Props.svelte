<script>
  import Child from "./Child.svelte";
  import Info from "./Info.svelte";

  const pkg = {
    name: "funicorn",
    version: 112358132134.55,
    speed: "blazing",
    website: "https://svelte.dev"
  };
</script>

<h2>Props</h2>
<p>Parent: "What is the answer?"</p>
<Child number={1} answer={42} />
<Child number={2} />
<!--no need for this crap: name={pkg.name} version={pkg.version} speed={pkg.speed} website={pkg.website}-->
<Info {...pkg} />
