import crypto from "node:crypto";
import { decode as decodeBolt11 } from "bolt11";
import type { NostrEvent } from "nostr-tools";
import type { Database } from "bun:sqlite";
import type { ServerWebSocket } from "bun";
import { Either, isOneOf, not } from "./utils.js";
import { parseRequiredTags, safeTraverse } from "./server-utils.js";
import type { Mutex, SubscriptionMaps } from "./server-utils.js";

type HandleNewZapParams = {
  ws: ServerWebSocket<unknown>;
  event: NostrEvent;
  db: Database;
  receiptMaps: SubscriptionMaps;
  receiptsMutex: Mutex;
};

export function handleNewZap({
  ws,
  event,
  db,
  receiptMaps,
  receiptsMutex
}: HandleNewZapParams) {
  const eitherTag = parseRequiredTags(event.tags, ["p", "bolt11", "preimage"]);

  if (Either.isLeft(eitherTag)) {
    ws.send(JSON.stringify(["OK", event.id, false, Either.getLeft(eitherTag)]));

    return;
  }

  const { p, bolt11, preimage } = Either.getRight(eitherTag);

  // verify preimage with bolt11
  const bolt11Decoded = decodeBolt11(bolt11);
  const hash = crypto
    .createHash("sha256")
    .update(Buffer.from(preimage, "hex"))
    .digest("hex");

  if (bolt11Decoded.tagsObject.payment_hash !== hash) {
    ws.send(
      JSON.stringify([
        "OK",
        event.id,
        false,
        "invalid: preimage does not match",
      ]),
    );

    return;
  }

  // insert receipt to db
  const insertReceipt = `INSERT INTO receipts (event_id, created_at, p, amount, bolt11, preimage, json) 
                           VALUES ($event_id, $created_at, $p, $amount, $bolt11, $preimage, $json)`;

  const amountMillisats =
    bolt11Decoded.millisatoshis ||
    (bolt11Decoded.satoshis ? bolt11Decoded.satoshis * 1000 : 0);

  const params = {
    $event_id: event.id,
    $created_at: event.created_at,
    $p: p,
    $amount: amountMillisats,
    $bolt11: bolt11,
    $preimage: preimage,
    $json: JSON.stringify(event),
  };

  db.run(insertReceipt, [params]);

  // send OK event as an ack
  ws.send(JSON.stringify(["OK", event.id, true, ""]));

  safeTraverse(receiptsMutex, receiptMaps.toFilter, (filterMap) => {
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
      const ws = receiptMaps.toSocket.get(subsciptionId);

      if (!ws) {
        receiptMaps.toSocket.delete(subsciptionId);
        receiptMaps.toFilter.delete(subsciptionId);

        return;
      }

      ws.send(JSON.stringify(["EVENT", event]));
    });
  });
}
