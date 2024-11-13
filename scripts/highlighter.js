import { SimplePool } from "nostr-tools";

import * as nip65 from "./nip65";
import * as nip07 from "./nip07";

const LOCAL_RELAY = "ws://localhost:3000";

const getWriteRelays = async () => {
  const defaultWriteRelays = [LOCAL_RELAY];

  if (window.nostr) {
    const pubkey = await window.nostr.getPublicKey();
    const nip07WriteRelays = (await fetchNip07Relays()).writeRelays;
    const nip65WriteRelays = (await fetchNip65Relays(nip07WriteRelays, pubkey)).writeRelays;

    const allRelays = [...nip07WriteRelays, ...nip65WriteRelays, ...defaultWriteRelays];

    console.log("allRelays write", allRelays);

    // TODO: uncomment this
    // return allRelays;
    return defaultWriteRelays;
  }

  return defaultWriteRelays;
}

const getReadRelays = async () => {
  const defaultReadRelays = [LOCAL_RELAY];
  
  if (window.nostr) {
    const pubkey = await window.nostr.getPublicKey();
    const nip07ReadRelays = (await fetchNip07Relays()).readRelays;
    const nip65ReadRelays = (
      await fetchNip65Relays([...nip07ReadRelays, ...defaultReadRelays], pubkey)
    ).readRelays;

    const allRelays = [...nip07ReadRelays, ...nip65ReadRelays, ...defaultReadRelays];

    console.log("allRelays read", allRelays);

    // TODO: uncomment this
    // return allRelays;
    return defaultReadRelays;
  }
  
  return defaultReadRelays;
}

const fetchNip65Relays = async (relays, pubkey) => {
  const pool = new SimplePool();

  const nip65Relays = await pool.get(relays, {
    kinds: [10002],
    authors: [pubkey],
    limit: 1,
  });

  if (!nip65Relays) {
    return { readRelays: [], writeRelays: [] };
  }

  return nip65.toReadWriteRelays(nip65Relays);
}

const fetchNip07Relays = async () => {
  const relayEntries = await window.nostr.getRelays();

  return nip07.toReadWriteRelays(relayEntries);
}

const sanitizeUrl = (url) => {
  let sanitizedUrl = url.replace(/^https?:\/\//, '');

  const basePath = "file:///Users/baris/Projects/the-simplest-bitcoin-book/";
  
  if (sanitizedUrl.startsWith(basePath)) {
    const relativePath = sanitizedUrl.slice(basePath.length);
    
    sanitizedUrl = `https://dhalsim.github.io/the-simplest-bitcoin-book/${relativePath}`;
  }

  console.log("sanitizedUrl", sanitizedUrl);

  return sanitizedUrl;
}

const publishPageHighlight = async (pageUrl, content) => {
  console.log("publishing page highlights");

  const highlightEvent = {
    "content": content,
    "created_at": Math.floor(Date.now() / 1000),
    "kind": 9802,
    "tags": [
      ["r", pageUrl]
    ]
  }

  const finalizedEvent = await window.nostr.signEvent(highlightEvent);

  console.log("finalizedEvent", finalizedEvent);

  const relays = await getWriteRelays();
  const pool = new SimplePool();

  console.log("write relays", relays);

  return pool.publish(relays, finalizedEvent);
}

const downloadPageHighlights = async () => {
  console.log("downloading page highlights");

  const relays = await getReadRelays();
  const pool = new SimplePool();

  const pageUrl = sanitizeUrl(window.location.href);

  pool.subscribeMany(relays, [{
    kinds: [9802],
    "#r": [pageUrl],
  }], (event) => {
    console.log(event);
  });
}

const initializeHighlighter = () => {
  console.log("highlighter loaded");

  // Add settings panel to the DOM
  const settingsPanel = document.createElement('div');
  settingsPanel.innerHTML = `
    <div class="settings-panel">
      <button class="settings-icon">⚙️</button>
      <div class="settings-popup hidden">
        <button class="highlighter-toggle"></button>
        <button class="comments-toggle"></button>
      </div>
    </div>
  `;
  
  document.body.appendChild(settingsPanel);

  // Initialize settings from localStorage
  const updateButtonLabels = () => {
    const highlighterEnabled = localStorage.getItem('highlighterEnabled') !== 'false';
    const commentsVisible = localStorage.getItem('commentsVisible') !== 'false';
    
    document.querySelector('.highlighter-toggle').textContent = 
      highlighterEnabled ? l18n.disableHighlighter : l18n.enableHighlighter;
    document.querySelector('.comments-toggle').textContent = 
      commentsVisible ? l18n.hideComments : l18n.showComments;
  };

  // Add event listeners
  document.querySelector('.settings-icon').addEventListener('click', () => {
    document.querySelector('.settings-popup').classList.toggle('hidden');
  });

  document.querySelector('.highlighter-toggle').addEventListener('click', () => {
    const currentState = localStorage.getItem('highlighterEnabled') !== 'false';
    localStorage.setItem('highlighterEnabled', !currentState);
    updateButtonLabels();
  });

  document.querySelector('.comments-toggle').addEventListener('click', () => {
    const currentState = localStorage.getItem('commentsVisible') !== 'false';
    localStorage.setItem('commentsVisible', !currentState);
    updateButtonLabels();
  });

  // Initialize button labels
  updateButtonLabels();
  downloadPageHighlights();

  document.addEventListener('nlAuth', async (e) => {
    // type is login, signup or logout
    if (e.detail.type === 'login' || e.detail.type === 'signup') {
      console.log("logged in/signed up");

      console.log(await window.nostr.getPublicKey());
    } else {
      console.log("logged out");
    }
  })

  document.addEventListener('keydown', async (e) => {
    if (window.nostr && e.key === 'h') {
      const selectedText = window.getSelection().toString();

      if (selectedText && selectedText.length > 0) {
        const url = window.location.href;
          
        await publishPageHighlight(url, selectedText);

        console.log("highlight published");
      }
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeHighlighter);
} else {
  initializeHighlighter();
}