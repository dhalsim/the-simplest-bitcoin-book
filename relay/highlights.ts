import { Either } from "./utils.ts";
import { parseRequiredTags } from "./server-utils.ts";

export function handleNewHighlight({
  ws,
  event,
  db,
  highlightMaps,
  highlightsMutex,
}) {
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
  const insertHighlight = `INSERT INTO highlights (event_id, created_at, r, content, json) 
                           VALUES ($event_id, $created_at, $r, $content, $json)`;

  const params = {
    $event_id: event.id,
    $created_at: event.created_at,
    $r: r,
    $content: content,
    $json: JSON.stringify(event),
  };

  db.run(insertHighlight, [params]);

  // send OK event as an ack
  ws.send(JSON.stringify(["OK", event.id, true, ""]));
}
