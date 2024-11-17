import { SimplePool } from "nostr-tools";

export function toReadWriteRelays(relays) {
  const relayTags = relays.tags.filter((tag) => tag[0] === "r");

  const readRelays = relayTags
    .filter((tag) => (tag[0] === "r" && tag[2] === "read") || !tag[2])
    .map((tag) => tag[1]);

  const writeRelays = relayTags
    .filter((tag) => (tag[0] === "r" && tag[2] === "write") || !tag[2])
    .map((tag) => tag[1]);

  const flatRelays = relayTags.map((tag) => ({
    relay: tag[1],
    read: tag[2] === "read" || !tag[2],
    write: tag[2] === "write" || !tag[2],
  }));

  return { readRelays, writeRelays, flatRelays, createdAt: relays.created_at };
}

export async function fetchNip65Relays(relays, pubkey) {
  const pool = new SimplePool();

  return await pool.get(relays, {
    kinds: [10002],
    authors: [pubkey],
    limit: 1
  });
}
