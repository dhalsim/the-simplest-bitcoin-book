import type { ServerWebSocket } from "bun";
import type { Filter } from "nostr-tools";

import { Either, parseTag } from "./utils.ts";

export class Mutex {
  queue;

  constructor() {
    this.queue = Promise.resolve();
  }

  lock() {
    let unlockNext;

    const willLock = new Promise((resolve) => (unlockNext = resolve));
    const willUnlock = this.queue.then(() => unlockNext);

    this.queue = willLock;

    return willUnlock;
  }
}

export async function safeInsert(mutex: Mutex, map: Map<string, any>, key: string, value: any) {
  const unlock = await mutex.lock();

  try {
    // Traverse or insert into the map safely
    map.set(key, value);
  } finally {
    unlock(undefined);
  }
}

export async function safeTraverse(mutex: Mutex, map: Map<string, any>, callback: (map: Map<string, any>) => void) {
  const unlock = await mutex.lock();

  try {
    // Traverse the map safely
    callback(map);
  } finally {
    unlock(undefined);
  }
}

export type SubscriptionMaps = {
  toSocket: Map<string, ServerWebSocket>;
  toFilter: Map<string, Filter>;
};

export function getSubscriptionMaps(): SubscriptionMaps {
  return {
    toSocket: new Map(),
    toFilter: new Map(),
  };
}

export function parseRequiredTags(eventTags: string[][], requiredTags: string[]) {
  const result = {};

  for (const t of requiredTags) {
    const parsedTag = parseTag(t, eventTags);

    if (!parsedTag) {
      return Either.left(`invalid: ${t} tag is required`);
    }

    result[t] = parsedTag;
  }

  return Either.right(result);
}
