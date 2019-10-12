<script>
  let count = 0;

  function handleClick() {
    count += 1;
  }

  //syntax for computed values, as {count} updates, {doubled} automagically updates
  $: doubled = count * 2;
  //can also run statements w $
  $: if (count >= 10) {
    alert(`count is dangerously high!`);
    count = 9;
  }

  let numbers = [1, 2, 3, 4];

  function addNumber() {
    //can't use .push() to create reactivity, a la "numbers.push(numbers.length + 1);"
    //numbers = [...numbers, numbers.length + 1];
    //is the same as
    numbers[numbers.length] = numbers.length + 1;
  }

  $: sum = numbers.reduce((t, n) => t + n, 0);
</script>

<h2>Reactivity</h2>

<!--this feels like Vue to me-->
<button on:click={handleClick}>
  Clicked {count} {count === 1 ? 'time' : 'times'}
</button>

<p>{count} doubled is {doubled}</p>

<p>{numbers.join(' + ')} = {sum}</p>

<button on:click={addNumber}>Add a number</button>
