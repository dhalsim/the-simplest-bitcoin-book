<script>
  import { SimplePool, verifyEvent, nip19 } from "nostr-tools";
  import { onMount } from "svelte";

  import { formatTimeAgo, sanitizeUrl, copyToClipboard } from "./utils";

  export let writeRelays;
  export let readRelays;
  export let l18n = {};

  let activePanel = null;
  let currentEvent = null;
  let currentProfile = null;

  let panelPosition = {
    top: 0,
    highlightCenter: 0,
    panelHeight: 400,
  };

  let likeCount = 0; // placeholder
  let commentCount = 0; // placeholder
  let zapCount = 0; // placeholder

  let panelHeight;

  $: if (panelHeight) {
    // Recalculate position when we get the actual height
    const highlightCenter = panelPosition.highlightCenter;
    let proposedTop = highlightCenter - panelHeight / 2;

    // Ensure panel stays within viewport
    const minTop = 20;
    const maxTop = window.innerHeight - panelHeight - 20;
    const finalTop = Math.min(Math.max(proposedTop, minTop), maxTop);

    panelPosition = {
      ...panelPosition,
      top: finalTop,
      panelHeight: panelHeight,
    };
  }

  onMount(() => {
    initializeHighlighter();

    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  });

  let textNodes = null;

  const initializeHighlighter = () => {
    textNodes = document.evaluate(
      "//text()",
      document.body,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null,
    );

    downloadPageHighlights();

    document.addEventListener("keydown", handleKeydown);
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

    const pool = new SimplePool();

    await pool.publish(writeRelays, finalizedEvent);

    if (subCloser) {
      subCloser.close();
    }

    downloadPageHighlights();
  };

  let subCloser;

  const downloadProfile = async (relays, pubkey) => {
    const pool = new SimplePool();

    const profile = await pool.get(relays, {
      authors: [pubkey],
      kinds: [0],
    });

    if (!profile || !profile.content) {
      return null;
    }

    return profile.content;
  };

  const downloadPageHighlights = async () => {
    console.log("downloading page highlights");

    const pool = new SimplePool();

    const pageUrl = sanitizeUrl(window.location.href);

    subCloser = pool.subscribeMany(
      readRelays,
      [
        {
          kinds: [9802],
          "#r": [pageUrl],
        },
      ],
      {
        onevent: async (event) => {
          const isValid = verifyEvent(event);

          const cachedProfile = localStorage.getItem(`profile-${event.pubkey}`);

          if (false && cachedProfile) {
            currentProfile = JSON.parse(cachedProfile);
          } else {
            downloadProfile(readRelays, event.pubkey).then((profile) => {
              console.log("Profile downloaded:", profile);

              localStorage.setItem(
                `profile-${event.pubkey}`,
                JSON.stringify(profile),
              );

              const anchor = document.querySelector(`#highlight-${event.id}`);

              if (anchor) {
                anchor.dataset.profile = JSON.stringify(profile);

                if (currentEvent && currentEvent.id === event.id) {
                  console.log("Updating current profile:", profile);
                  console.log("Current event:", currentEvent);
                  console.log("Current activePanel before:", activePanel);

                  currentProfile = profile;

                  // Force reactivity by creating a new object
                  activePanel = {
                    ...activePanel,
                    displayName:
                      profile?.display_name ||
                      profile?.name ||
                      activePanel.displayName,
                    picture: profile?.picture,
                    lud16: profile?.lud16,
                    nip05: profile?.nip05,
                  };

                  console.log("Updated activePanel:", activePanel);
                }
              }
            });
          }

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
                anchor.id = `highlight-${event.id}`;
                anchor.style.backgroundColor = "yellow";
                anchor.style.cursor = "pointer";
                anchor.style.textDecoration = "none";
                anchor.dataset.event = JSON.stringify(event);
                anchor.classList.add("highlight-anchor");

                anchor.addEventListener("click", (e) => {
                  e.preventDefault();

                  showHighlightPanel(anchor);
                });

                range.surroundContents(anchor);
              }
            }
          } else {
            console.log("invalid highlight event", event);
          }
        },
      },
    );
  };

  function showHighlightPanel(anchor) {
    console.log("showing highlight panel");

    const anchorRect = anchor.getBoundingClientRect();
    const highlightCenter = anchorRect.top + anchorRect.height / 2;

    // Initial position - will be adjusted once we have real height
    currentEvent = JSON.parse(anchor.dataset.event);

    console.log("currentEvent", currentEvent);
    console.log("currentProfile", currentProfile);

    const npub = nip19.npubEncode(currentEvent.pubkey);

    activePanel = {
      eventId: currentEvent.id,
      npub,
      displayName: `${npub.slice(0, 6)}...${npub.slice(-6)}`,
      picture: `https://robohash.org/${currentEvent.pubkey}`,
      lud16: currentProfile?.lud16,
      nip05: currentProfile?.nip05,
      nevent: nip19.neventEncode({
        id: currentEvent.id,
        relays: writeRelays,
        author: currentEvent.pubkey,
        kind: currentEvent.kind,
      }),
    };

    panelPosition = {
      top: highlightCenter, // temporary position
      highlightCenter: highlightCenter,
      panelHeight: 0, // will be updated
    };

    // Hide settings panel and banner
    const settingsPanel = document.querySelector(".settings-panel");
    const banner = document.querySelector("nl-banner");

    if (settingsPanel) {
      settingsPanel.style.display = "none";
    }

    if (banner) {
      banner.style.display = "none";
    }
  }

  let isClosing = false;

  function closePanel() {
    isClosing = true;

    setTimeout(() => {
      activePanel = null;
      isClosing = false;

      // Show settings panel and banner again
      const settingsPanel = document.querySelector(".settings-panel");
      const banner = document.querySelector("nl-banner");

      if (settingsPanel) {
        settingsPanel.style.display = "";
      }

      if (banner) {
        banner.style.display = "";
      }
    }, 300);
  }

  // Helper function to extract and format comment from tags
  function getCommentFromTags(tags) {
    const commentTag = tags.find((tag) => tag[0] === "comment");

    if (commentTag) {
      return `<p><strong>Comment:</strong> ${commentTag[1]}</p>`;
    }

    return "";
  }

  function handleClickOutside(event) {
    // Check if click is outside the panel and not on a highlight
    if (
      activePanel &&
      !event.target.closest(".highlight-side-panel") &&
      !event.target.closest(".highlight-anchor")
    ) {
      closePanel();
    }
  }

  onMount(() => {
    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("nlAuth", handleAuth);
      document.removeEventListener("keydown", handleKeydown);
    };
  });
</script>

{#if activePanel && currentEvent}
  <div
    class="highlight-side-panel"
    class:slide-out={isClosing}
    bind:clientHeight={panelHeight}
    style="
      top: {panelPosition.top}px;
      --highlight-center: {panelPosition.highlightCenter}px;
      --panel-top: {panelPosition.top}px;
      --panel-height: {panelHeight}px;
    "
  >
    <div class="panel-content">
      <span class="timestamp">{formatTimeAgo(currentEvent.created_at)}</span>

      <button class="close-btn" on:click={closePanel}>×</button>

      <div class="header">
        <div class="user-info">
          <img
            class="avatar"
            src={activePanel.picture ||
              `https://robohash.org/${currentEvent.pubkey}`}
            alt="Profile"
          />
          <div class="user-meta">
            <a href="https://nostr.at/{activePanel.npub}" class="username">
              {activePanel.displayName}
            </a>
          </div>
        </div>
      </div>

      <div class="content">
        {currentEvent.content}
      </div>

      {#if getCommentFromTags(currentEvent.tags)}
        <div class="comment">
          {getCommentFromTags(currentEvent.tags)}
        </div>
      {/if}

      <div class="actions">
        <div class="action-group">
          <button class="action-btn">
            <span>♥️</span>
            <span class="count">{likeCount}</span>
          </button>
          <button class="action-btn">
            <span>💬</span>
            <span class="count">{commentCount}</span>
          </button>
        </div>
        <div class="action-group">
          <button class="action-btn">
            <span>⚡️</span>
            <span class="count">{zapCount}</span>
          </button>
          <button class="action-btn">
            <span>↗️</span>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .timestamp {
    position: absolute;
    right: 20px;
    top: -7px;
  }

  .highlight-side-panel {
    position: fixed;
    right: 20px;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    width: 300px;
    border: 1px solid #eee;
    animation: slideIn 0.3s ease-out forwards;
    margin-left: 15px;
  }

  /* Creates the triangle bulge */
  .highlight-side-panel::before {
    content: "";
    position: absolute;
    left: -10px;
    /* Clamp the triangle position within panel boundaries */
    top: clamp(
      20px,
      /* minimum distance from panel top */
        calc(var(--highlight-center) - var(--panel-top) - 8px),
      calc(var(--panel-height) - 36px) /* maximum distance from panel top */
    );
    width: 0;
    height: 0;
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
    border-right: 10px solid white;
    filter: drop-shadow(-2px 0px 1px rgba(0, 0, 0, 0.1));
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }

  .slide-out {
    animation: slideOut 0.3s ease-in forwards;
  }

  .panel-content {
    position: relative;
  }

  .close-btn {
    position: absolute;
    top: -10px;
    right: -10px;
    border: none;
    background: none;
    font-size: 20px;
    cursor: pointer;
    padding: 0 5px;
  }

  .avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
  }
</style>
