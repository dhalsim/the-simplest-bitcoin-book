import type Database from "bun:sqlite";
import type { NostrEvent } from "nostr-tools";
import type { ServerWebSocket } from "bun";

import { Either, isOneOf, not } from "./utils.js";
import { Mutex, parseRequiredTags, safeTraverse, SubscriptionMaps } from "./server-utils.ts";

type HandleNewCommentParams = {
  ws: ServerWebSocket<unknown>;
  event: NostrEvent;
  db: Database;
  commentMaps: SubscriptionMaps;
  commentsMutex: Mutex;
};

export function handleNewComment({
  ws,
  event,
  db,
  commentMaps,
  commentsMutex,
}: HandleNewCommentParams) {
  const eitherTag = parseRequiredTags(event.tags, ["r"]);

  if (Either.isLeft(eitherTag)) {
    ws.send(JSON.stringify(["OK", event.id, false, Either.getLeft(eitherTag)]));

    return;
  }

  const { r } = Either.getRight(eitherTag);

  // insert comment to db
  const insertComment = `INSERT INTO comments (event_id, created_at, pubkey, r, json) 
                           VALUES ($event_id, $created_at, $pubkey, $r, $json)`;

  const params = {
    $event_id: event.id,
    $created_at: event.created_at,
    $pubkey: event.pubkey,
    $r: r,
    $json: JSON.stringify(event),
  };

  db.run(insertComment, [params]);

  // send OK event as an ack
  ws.send(JSON.stringify(["OK", event.id, true, ""]));

  safeTraverse(commentsMutex, commentMaps.toFilter, (filterMap: SubscriptionMaps["toFilter"]) => {
    filterMap.forEach((filter, subsciptionId) => {
      if (filter.since && event.created_at < filter.since) {
        // event is before since
        return;
      }

      if (filter.until && event.created_at > filter.until) {
        // event is after until
        return;
      }

      if (filter.ids && not(isOneOf(event.id, filter.ids))) {
        return;
      }

      // this event can go to ws
      const ws = commentMaps.toSocket.get(subsciptionId);

      if (!ws) {
        commentMaps.toSocket.delete(subsciptionId);
        commentMaps.toFilter.delete(subsciptionId);

        return;
      }

      ws.send(JSON.stringify(["EVENT", event]));
    });
  });
}
