import { type Filter, kinds, verifyEvent } from "nostr-tools";
import type { Database } from "bun:sqlite";
import type { ServerWebSocket } from "bun";

import { isOneOf, isValidTimestamp, not } from "./utils.ts";
import { safeInsert, Mutex, SubscriptionMaps } from "./server-utils.ts";
import { handleNewZap } from "./zaps.ts";
import { handleNewComment } from "./comments.ts";
import { handleNewHighlight } from "./highlights.ts";

const commentsMutex = new Mutex();
const highlightsMutex = new Mutex();
const receiptsMutex = new Mutex();

export function validateWebsocketMessage({ ws, message }) {
  if (Buffer.isBuffer(message)) {
    ws.send(
      JSON.stringify(["NOTICE", "error: Buffer message is not supported"]),
    );
    
    ws.close();

    return;
  }

  let parsedMessage;

  try {
    parsedMessage = JSON.parse(message);
  } catch (err) {
    ws.send(JSON.stringify(["NOTICE", "error: could not parse JSON: " + err]));
    ws.close();

    return;
  }

  if (!Array.isArray(parsedMessage)) {
    ws.send(JSON.stringify(["NOTICE", "message must be an array"]));
    ws.close();

    return;
  }

  const [type, ...params] = parsedMessage;

  if (not(isOneOf(type, ["REQ", "EVENT", "CLOSE"]))) {
    ws.send(JSON.stringify(["NOTICE", `unknown message type ${type}`]));
    ws.close();

    return;
  }

  return { type, params };
}

type HandleNewSubscriberParams = {
  ws: ServerWebSocket<unknown>;
  params: any[];
  db: Database;
  commentMaps: SubscriptionMaps;
  receiptMaps: SubscriptionMaps;
  highlightMaps: SubscriptionMaps;
};

export function handleNewSubscriber({
  ws,
  params,
  db,
  commentMaps,
  receiptMaps,
  highlightMaps,
}: HandleNewSubscriberParams) {
  // a new subsciption
  const [subscriptionId, ...filters] = params;

  const subsExist =
    commentMaps.toSocket.get(subscriptionId) ||
    commentMaps.toFilter.get(subscriptionId) ||
    receiptMaps.toSocket.get(subscriptionId) ||
    receiptMaps.toFilter.get(subscriptionId) ||
    highlightMaps.toSocket.get(subscriptionId) ||
    highlightMaps.toFilter.get(subscriptionId);

  if (subsExist) {
    ws.send(
      JSON.stringify([
        "CLOSED",
        subscriptionId,
        `duplicate: ${subscriptionId} already opened`,
      ]),
    );
    
    ws.close();
  }

  if (filters.length !== 1) {
    ws.send(
      JSON.stringify([
        "CLOSED",
        subscriptionId,
        "unsupported: only one filter object is allowed",
      ]),
    );
    
    ws.close();

    return;
  }

  const filter: Filter = filters[0];

  if (!filter.kinds || filter.kinds.length !== 1) {
    ws.send(JSON.stringify(["CLOSED", subscriptionId, "unsupported: kinds, only one kind is allowed"]));
    
    ws.close();

    return;
  }

  const isFilterKindSupported = isOneOf(filter.kinds[0], [kinds.ShortTextNote, kinds.Highlights, kinds.Zap]);

  if (!isFilterKindSupported) {
    ws.send(JSON.stringify(["CLOSED", subscriptionId, "unsupported: kind is not supported"]));
    
    ws.close();

    return;
  }

  const kind = filter.kinds[0];

  let rows: any[] = [];

  // comments
  if (kind === kinds.ShortTextNote) {
    let query = "SELECT json FROM comments WHERE 1 = 1";
    let filtered = false;

    if (filter["#r"] && filter["#r"].length) {
      query += " AND r = $r";
      filtered = true;
    }

    if (filter.authors && filter.authors.length) {
      query += ` AND author IN (${filter.authors.join(", ")})`;
      filtered = true;
    }

    if (filter.since) {
      query += " AND created_at >= $since";
      filtered = true;
    }

    if (filter.until) {
      query += " AND created_at < $until";
      filtered = true;
    }

    if (filter.ids && filter.ids.length) {
      query += ` AND event_id IN (${filter.ids.join(", ")})`;
      filtered = true;
    }

    if (!filtered) {
      ws.send(JSON.stringify(["CLOSED", subscriptionId, "unsupported: no filter applied"]));
      
      ws.close();

      return;
    }

    rows = db.query(query).all({
      $r: filter["#r"]?.[0],
      $since: filter.since,
      $until: filter.until,
    } as any);

    rows.forEach((row) => {
      const json = JSON.parse(row.json);

      ws.send(JSON.stringify(["EVENT", subscriptionId, json]));
    });

    ws.send(JSON.stringify(["EOSE", subscriptionId]));

    safeInsert(commentsMutex, commentMaps.toFilter, subscriptionId, filter);
    safeInsert(commentsMutex, commentMaps.toSocket, subscriptionId, ws);
  } 
  // receipts
  else if (kind === kinds.Zap) {
    let query = "SELECT json FROM receipts WHERE 1 = 1";
    let filtered = false;

    if (filter["#p"]) {
      query += " AND p = $p";
      filtered = true;
    }

    if (filter.since) {
      query += " AND created_at >= $since";
      filtered = true;
    }

    if (filter.until) {
      query += " AND created_at < $until";
      filtered = true;
    }

    if (filter.ids && filter.ids.length) {
      query += ` AND event_id IN (${filter.ids.join(", ")})`;
      filtered = true;
    }

    if (!filtered) {
      ws.send(JSON.stringify(["CLOSED", subscriptionId, "unsupported: no filter applied"]));
      
      ws.close();

      return;
    }

    rows = db.query(query).all({
      $p: filter["#p"]?.[0],
      $since: filter.since,
      $until: filter.until,
    } as any);

    safeInsert(receiptsMutex, receiptMaps.toFilter, subscriptionId, filter);
    safeInsert(receiptsMutex, receiptMaps.toSocket, subscriptionId, ws);
  } 
  // highlights
  else if (kind === kinds.Highlights) {
    let query = "SELECT json FROM highlights WHERE 1 = 1";
    let filtered = false;

    if (filter["#r"]) {
      query += " AND r = $r";
      filtered = true;
    }

    if (filter.since) {
      query += " AND created_at >= $since";
      filtered = true;
    }

    if (filter.until) {
      query += " AND created_at < $until";
      filtered = true;
    }

    if (filter.ids && filter.ids.length) {
      query += ` AND event_id IN (${filter.ids.join(", ")})`;
      filtered = true;
    }

    if (!filtered) {
      ws.send(JSON.stringify(["CLOSED", subscriptionId, "unsupported: no filter applied"]));
      
      ws.close();

      return;
    }

    console.log("query", query);
    
    rows = db.query(query).all({
      r: filter["#r"]?.[0],
      since: filter.since,
      until: filter.until,
    } as any);

    safeInsert(highlightsMutex, highlightMaps.toFilter, subscriptionId, filter);
    safeInsert(highlightsMutex, highlightMaps.toSocket, subscriptionId, ws);
  } 
  else {
    console.log("unsupported");
  }
}

type HandleNewEventParams = {
  ws: ServerWebSocket<unknown>;
  params: any[];
  db: Database;
  receiptMaps: SubscriptionMaps;
  commentMaps: SubscriptionMaps;
  highlightMaps: SubscriptionMaps;
};

export function handleNewEvent({
  ws,
  params,
  db,
  receiptMaps,
  commentMaps,
  highlightMaps,
}: HandleNewEventParams) {
  const event = params[0];

  const { id, created_at, kind, tags } = event;

  if (!verifyEvent(event)) {
    ws.send(JSON.stringify(["OK", id, false, "invalid: not verified"]));

    return;
  }

  if (not(isOneOf(kind, [kinds.ShortTextNote, kinds.Zap, kinds.Highlights]))) {
    ws.send(
      JSON.stringify(["OK", id, false, "invalid: kind is not supported"]),
    );

    return;
  }

  if (!isValidTimestamp(created_at)) {
    ws.send(
      JSON.stringify([
        "OK",
        id,
        false,
        "invalid: created_at field is not within time range of the server time",
      ]),
    );

    return;
  }

  if (!Array.isArray(tags)) {
    ws.send(
      JSON.stringify(["OK", id, false, "invalid: tags should be an array"]),
    );

    return;
  }

  const verified = verifyEvent(event);

  if (!verified) {
    ws.send(JSON.stringify(["OK", id, false, "invalid: not verified"]));

    return;
  }

  if (kind === kinds.Zap) {
    handleNewZap({ ws, event, receiptMaps, db, receiptsMutex });
  } else if (kind === kinds.ShortTextNote) {
    handleNewComment({ ws, event, commentMaps, db, commentsMutex });
  } else if (kind === kinds.Highlights) {
    handleNewHighlight({ ws, event, highlightMaps, db, highlightsMutex });
  }
}
