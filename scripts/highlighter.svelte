<script>
  import { SimplePool, verifyEvent, nip19 } from "nostr-tools";
  import * as nip65 from "./nip65";
  import * as nip07 from "./nip07";

  // Move global variables to component state
  let textNodes = null;

  // Add onMount for initialization
  import { onMount } from "svelte";

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
  };

  const fetchNip07Relays = async () => {
    const relayEntries = await window.nostr.getRelays();

    return nip07.toReadWriteRelays(relayEntries);
  };

  const sanitizeUrl = (url) => {
    let sanitizedUrl = url.replace(/^https?:\/\//, "");

    const basePath = "file:///Users/baris/Projects/the-simplest-bitcoin-book/";

    if (sanitizedUrl.startsWith(basePath)) {
      const relativePath = sanitizedUrl.slice(basePath.length);

      sanitizedUrl = `https://dhalsim.github.io/the-simplest-bitcoin-book/${relativePath}`;
    }

    console.log("sanitizedUrl", sanitizedUrl);

    return sanitizedUrl;
  };

  const publishPageHighlight = async (pageUrl, content, comment) => {
    console.log("publishing page highlights");

    let tags = [
      ["r", pageUrl, "source"],
      [
        "p",
        "6867d899ce6b677b89052602cfe04a165f26bb6a1a6390355f497f9ee5cb0796",
        "wss://relay.nostr.band",
        "author",
      ],
    ];

    if (comment) {
      tags.push(["comment", comment]);
    }

    if (l18n.translatorTag) {
      tags.push(["p", ...l18n.translatorTag]);
    }

    const highlightEvent = {
      content: content,
      created_at: Math.floor(Date.now() / 1000),
      kind: 9802,
      tags: tags,
    };

    const finalizedEvent = await window.nostr.signEvent(highlightEvent);

    console.log("finalizedEvent", finalizedEvent);

    // TODO: fix this later
    // const relays = await getWriteRelays();
    const relays = [LOCAL_RELAY];
    const pool = new SimplePool();

    console.log("write relays", relays);

    return pool.publish(relays, finalizedEvent);
  };

  const downloadPageHighlights = async () => {
    console.log("downloading page highlights");

    const relays = await getReadRelays();
    const pool = new SimplePool();

    const pageUrl = sanitizeUrl(window.location.href);

    pool.subscribeMany(
      relays,
      [
        {
          kinds: [9802],
          "#r": [pageUrl],
        },
      ],
      {
        onevent: (event) => {
          const isValid = verifyEvent(event);

          console.log("isValid", isValid);

          if (isValid) {
            console.log("highlight event", event);

            const content = event.content;

            for (let i = 0; i < textNodes.snapshotLength; i++) {
              const node = textNodes.snapshotItem(i);

              if (node.textContent.includes(content)) {
                const range = document.createRange();

                range.selectNode(node);

                const anchor = document.createElement("a");
                anchor.style.backgroundColor = "yellow";
                anchor.style.cursor = "pointer";
                anchor.style.textDecoration = "none";
                anchor.dataset.event = JSON.stringify(event);

                anchor.addEventListener("click", (e) => {
                  e.preventDefault();

                  showHighlightModal(event);
                });

                range.surroundContents(anchor);
              }
            }
          }
        },
      },
    );
  };

  let settingsPanelVisible = false;
  let settingsPanel; // Reference to the settings panel element

  // Handle clicks outside the settings panel
  function handleClickOutside(event) {
    if (
      settingsPanelVisible &&
      settingsPanel &&
      !settingsPanel.contains(event.target)
    ) {
      settingsPanelVisible = false;
    }
  }

  const updateSettingsButtonLabels = () => {
    const highlighterEnabled =
      localStorage.getItem("highlighterEnabled") !== "false";
    const commentsVisible = localStorage.getItem("commentsVisible") !== "false";

    document.querySelector(".highlighter-toggle").textContent =
      highlighterEnabled ? l18n.disableHighlighter : l18n.enableHighlighter;
    document.querySelector(".comments-toggle").textContent = commentsVisible
      ? l18n.hideComments
      : l18n.showComments;
  };

  const toggleHighlighter = () => {
    const highlighterEnabled =
      localStorage.getItem("highlighterEnabled") !== "false";

    localStorage.setItem("highlighterEnabled", !highlighterEnabled);

    updateSettingsButtonLabels();
  };

  const toggleComments = () => {
    const commentsVisible = localStorage.getItem("commentsVisible") !== "false";

    localStorage.setItem("commentsVisible", !commentsVisible);

    updateSettingsButtonLabels();
  };

  // Convert the initialization to use onMount
  onMount(() => {
    // Initialize settings from localStorage
    updateSettingsButtonLabels();

    initializeHighlighter();

    // Add click listener to document
    document.addEventListener("click", handleClickOutside);

    // Clean up event listeners on component destroy
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("nlAuth", handleAuth);
      document.removeEventListener("keydown", handleKeydown);
    };
  });

  // Extract event handlers as named functions
  const handleAuth = async (e) => {
    if (e.detail.type === "login" || e.detail.type === "signup") {
      console.log("logged in/signed up");
      console.log(await window.nostr.getPublicKey());
    } else {
      console.log("logged out");
    }
  };

  const handleKeydown = async (e) => {
    if (window.nostr && e.key === "h") {
      const selectedText = window.getSelection().toString();
      if (selectedText && selectedText.length > 0) {
        const url = sanitizeUrl(window.location.href);
        await publishPageHighlight(url, selectedText);
        console.log("highlight published");
      }
    }
  };

  // Modify initializeHighlighter to use these named handlers
  const initializeHighlighter = () => {
    textNodes = document.evaluate(
      "//text()",
      document.body,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null,
    );

    console.log("textNodes loaded");

    downloadPageHighlights();

    console.log("highlighter loaded");

    document.addEventListener("nlAuth", handleAuth);
    document.addEventListener("keydown", handleKeydown);
  };

  /** @param {import('nostr-tools').Event} event */
  const showHighlightModal = (event, writeRelays) => {
    const modal = document.createElement("div");
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 2px 2px 10px rgba(0,0,0,0.1);
      z-index: 1000;
      max-width: 500px;
    `;

    const npub = nip19.npubEncode(event.pubkey);
    const nevent = nip19.neventEncode({
      id: event.id,
      relays: writeRelays,
      author: event.pubkey,
      kind: event.kind,
    });

    // Create elements
    const title = document.createElement("h3");
    title.textContent = "Highlight Details";

    const neventP = document.createElement("p");
    const neventLink = document.createElement("a");
    const neventStrong = document.createElement("strong");
    neventStrong.textContent = "Open Event: ";

    neventP.appendChild(neventStrong);
    neventP.appendChild(neventLink);

    neventLink.target = "_blank";
    neventLink.href = `https://nostr.at/${nevent}`;
    neventLink.appendChild(document.createTextNode(nevent.slice(0, 6)));
    neventLink.appendChild(document.createTextNode("..."));
    neventLink.appendChild(document.createTextNode(nevent.slice(-6)));

    const createdDate = document.createElement("p");
    const createdStrong = document.createElement("strong");
    createdStrong.textContent = "Created: ";
    createdDate.appendChild(createdStrong);
    createdDate.appendChild(
      document.createTextNode(
        new Date(event.created_at * 1000).toLocaleString(),
      ),
    );

    const authorP = document.createElement("p");
    const authorStrong = document.createElement("strong");
    authorStrong.textContent = "Author: ";

    const authorLink = document.createElement("a");
    authorLink.target = "_blank";
    authorLink.href = `https://nostr.at/${npub}`;
    authorLink.textContent = `${npub.slice(0, 6)}...${npub.slice(-6)}`;

    const copyLink = document.createElement("a");
    copyLink.href = "#";
    copyLink.textContent = "💾";
    copyLink.title = "Copy npub";
    copyLink.style.textDecoration = "none";

    copyLink.onclick = (e) => {
      e.preventDefault();
      navigator.clipboard.writeText(npub);

      copyLink.textContent = "✅";

      setTimeout(() => {
        copyLink.textContent = "💾";
      }, 1000);
    };

    authorP.appendChild(authorStrong);
    authorP.appendChild(authorLink);
    authorP.appendChild(document.createTextNode(" "));
    authorP.appendChild(copyLink);

    const closeButton = document.createElement("button");
    closeButton.textContent = "Close";
    closeButton.style.marginTop = "10px";
    closeButton.onclick = () => modal.remove();

    // Append all elements to modal
    modal.appendChild(title);
    modal.appendChild(neventP);
    modal.appendChild(createdDate);
    modal.appendChild(authorP);
    modal.appendChild(closeButton);

    document.body.appendChild(modal);
  };
</script>

<!-- Settings panel -->
<div class="settings-panel" bind:this={settingsPanel}>
  <button
    class="settings-icon"
    on:click|stopPropagation={() =>
      (settingsPanelVisible = !settingsPanelVisible)}>⚙️</button
  >

  <div class="settings-popup" class:hidden={!settingsPanelVisible}>
    <button class="highlighter-toggle" on:click={() => toggleHighlighter()}
    ></button>
    <button class="comments-toggle" on:click={() => toggleComments()}></button>
  </div>
</div>

<style>
  .settings-panel {
    /* Add your styles here */
  }

  .settings-popup.hidden {
    display: none;
  }
</style>
