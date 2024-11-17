<script>
  import { onMount } from "svelte";
  import { highlighterEnabled, commentsVisible } from "./stores/settings.js";

  import Highlighter from "./components/Highlighter.svelte";
  import SettingsPanel from "./components/SettingsPanel.svelte";
  import Comments from "./components/Comments.svelte";

  import * as nip07 from "./nip07.js";
  import * as nip65 from "./nip65.js";

  const LOCAL_RELAY = "ws://localhost:3000";
  const USE_ONLY_LOCAL_RELAY = true;

  console.log("USE_ONLY_LOCAL_RELAY", USE_ONLY_LOCAL_RELAY);

  const fetchRelays = async (pubkey) => {
    const nip07Relays = nip07.toReadWriteRelays(await window.nostr.getRelays());
    const nip65Relays = nip65.toReadWriteRelays(
      await nip65.fetchNip65Relays(nip07Relays.readRelays, pubkey),
    );

    return { nip07Relays, nip65Relays };
  };

  const getWriteRelays = async (nip07Relays, nip65Relays) => {
    return [
      ...nip07Relays.writeRelays,
      ...nip65Relays.writeRelays,
      LOCAL_RELAY,
    ];
  };

  const getReadRelays = async (nip07Relays, nip65Relays) => {
    return [...nip07Relays.readRelays, ...nip65Relays.readRelays, LOCAL_RELAY];
  };

  let writeRelays = [];
  let readRelays = [];

  const handleAuth = async (e) => {
    if (e.detail.type === "login" || e.detail.type === "signup") {
      console.log("logged in/signed up");

      if (window.nostr) {
        initNostr();
      }
    } else {
      console.log("logged out");
    }
  };

  const initNostr = async () => {
    if (USE_ONLY_LOCAL_RELAY) {
      writeRelays = [LOCAL_RELAY];
      readRelays = [LOCAL_RELAY, "wss://relay.damus.io"];
    } else {
      const pubkey = await window.nostr.getPublicKey();
      const relays = await fetchRelays(pubkey);

      writeRelays = await getWriteRelays(
        relays.nip07Relays,
        relays.nip65Relays,
      );
      readRelays = await getReadRelays(relays.nip07Relays, relays.nip65Relays);
    }
  };

  let l18n = {};

  onMount(async () => {
    try {
      const language = window.language || "english"; // fallback to english if not set
      const translations = await import(`../${language}/l18n.json`);
      l18n = translations.default;
    } catch (error) {
      console.error("Failed to load translations:", error);

      // Fallback to english if loading fails
      const englishTranslations = await import("../english/l18n.json");
      l18n = englishTranslations.default;
    }

    document.addEventListener("nlAuth", handleAuth);

    return () => {
      document.removeEventListener("nlAuth", handleAuth);
    };
  });

  const removeHighlights = () => {
    document.querySelectorAll(".highlight-anchor").forEach((anchor) => {
      anchor.remove();
    });
  };

  // Watch for changes and cleanup when disabled
  $: if (!$highlighterEnabled) {
    removeHighlights();
  }
</script>

<div class="page-components">
  <SettingsPanel {l18n} />

  {#if $highlighterEnabled && readRelays.length > 0 && writeRelays.length > 0}
    <Highlighter {l18n} {writeRelays} {readRelays} />
  {/if}

  {#if $commentsVisible}
    <Comments />
  {/if}
</div>
