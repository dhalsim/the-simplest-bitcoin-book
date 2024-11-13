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