import { writable } from 'svelte/store';

export const highlighterEnabled = writable(localStorage.getItem("highlighterEnabled") !== "false");
export const commentsVisible = writable(localStorage.getItem("commentsVisible") !== "false");
export const personalHighlightsOnly = writable(false);

// Optional: Subscribe to changes to sync with localStorage
highlighterEnabled.subscribe(value => {
  localStorage.setItem("highlighterEnabled", value);
});

commentsVisible.subscribe(value => {
  localStorage.setItem("commentsVisible", value);
});