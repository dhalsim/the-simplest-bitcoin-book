<script>
  import { onMount } from "svelte";
  import {
    highlighterEnabled,
    commentsVisible,
    personalHighlightsOnly,
  } from "../stores/settings.js";

  export let l18n = {};

  let settingsPanel;
  let settingsPanelVisible;

  function handleClickOutside(event) {
    if (
      settingsPanelVisible &&
      settingsPanel &&
      !settingsPanel.contains(event.target)
    ) {
      settingsPanelVisible = false;
    }
  }

  onMount(async () => {
    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  });

  const toggleHighlighter = () => {
    $highlighterEnabled = !$highlighterEnabled;
  };

  const toggleComments = () => {
    $commentsVisible = !$commentsVisible;
  };

  const togglePersonalHighlightsOnly = () => {
    $personalHighlightsOnly = !$personalHighlightsOnly;
  };
</script>

<div class="settings-panel" bind:this={settingsPanel}>
  <button
    class="settings-icon"
    on:click|stopPropagation={() =>
      (settingsPanelVisible = !settingsPanelVisible)}>⚙️</button
  >

  <div class="settings-popup" class:hidden={!settingsPanelVisible}>
    <h3 class="settings-title">{l18n.nostrSettings}</h3>

    <label class="settings-option">
      <input
        type="checkbox"
        checked={$highlighterEnabled}
        on:change={toggleHighlighter}
      />
      <span>{l18n.enableHighlighter}</span>
    </label>

    <label class="settings-option">
      <input
        type="checkbox"
        checked={$commentsVisible}
        on:change={toggleComments}
      />
      <span>{l18n.showComments}</span>
    </label>

    <label class="settings-option">
      <input
        type="checkbox"
        checked={$personalHighlightsOnly}
        on:change={togglePersonalHighlightsOnly}
      />
      <span>{l18n.showOnlyMyHighlights}</span>
    </label>
  </div>
</div>

<style>
  .settings-panel {
    position: fixed;
    right: 3px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1000;
  }

  .settings-icon {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    padding: 8px;
  }

  .settings-popup {
    min-width: 200px; /* Ensure enough space for text */
    background: #ffffff;
    border: 1px solid #e0e0e0;
    padding: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .settings-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    cursor: pointer;
    color: #333;
    font-size: 14px;
  }

  .settings-option:hover {
    color: #000;
  }

  .settings-option input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  .settings-popup.hidden {
    display: none;
  }

  .settings-popup:not(.hidden) .settings-title {
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }
</style>
