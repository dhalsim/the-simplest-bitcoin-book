import PageScripts from "./PageScripts.svelte";

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  const target = document.getElementById('components-container');

  if (target) {
    new PageScripts({
      target,
    });
  }
});
