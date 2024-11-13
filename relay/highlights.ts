import { Either } from "./utils.ts";
import { parseRequiredTags, safeTraverse } from "./server-utils.ts";

export function handleNewHighlight({
  ws,
  event,
  db,
  highlightMaps,
  highlightsMutex,
}) {
  console.log("handleNewHighlight");

  const eitherTag = parseRequiredTags(event.tags, ["r"]);

  if (Either.isLeft(eitherTag)) {
    ws.send(JSON.stringify(["OK", event.id, false, Either.getLeft(eitherTag)]));

    return;
  }

  const { r } = Either.getRight(eitherTag);

  const { content } = event;

  if (typeof content !== "string") {
    ws.send(
      JSON.stringify(["NOTICE", "error: content is not string"]),
    );

    return;
  }

  // insert highlight to db
  const insertHighlight = `INSERT INTO highlights (event_id, created_at, pubkey, r, json) 
                           VALUES ($event_id, $created_at, $pubkey, $r, $json)`;

  const params = {
    event_id: event.id,
    created_at: event.created_at,
    pubkey: event.pubkey,
    r: r,
    json: JSON.stringify(event),
  };

  db.run(insertHighlight, params);

  // send OK event as an ack
  ws.send(JSON.stringify(["OK", event.id, true, ""]));

  safeTraverse(highlightsMutex, highlightMaps.toSocket, (highlightsMap) => {
    highlightsMap.forEach((socket) => {
      socket.send(JSON.stringify(["EVENT", event]));
    });
  });
}
