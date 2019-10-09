<script>
  export let name;
</script>

<style>
  h1 {
    color: hotpink;
  }
</style>

<!--like handlebars but with one less set of {}-->
<h1>Hello {name.toUpperCase()}!</h1>
