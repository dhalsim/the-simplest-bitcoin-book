import { getDb } from "./db.ts";
import { fetch } from "./fetch.ts";
import { getSubscriptionMaps } from "./server-utils.ts";
import {
  handleNewEvent,
  handleNewSubscriber,
  validateWebsocketMessage,
} from "./websocket.ts";

const db = getDb();

const commentMaps = getSubscriptionMaps();
const receiptMaps = getSubscriptionMaps();
const highlightMaps = getSubscriptionMaps();

const server = Bun.serve({
  fetch,
  websocket: {
    message(ws, message) {
      console.log("message", message);

      const validated = validateWebsocketMessage({ ws, message });

      if (!validated) {
        return;
      }

      const { type, params } = validated;

      if (type === "REQ") {
        handleNewSubscriber({
          ws,
          params,
          db,
          receiptMaps,
          commentMaps,
          highlightMaps,
        });
      } else if (type === "EVENT") {
        handleNewEvent({
          ws,
          params,
          db,
          receiptMaps,
          commentMaps,
          highlightMaps,
        });
      } else if (type === "CLOSE") {
        const subsciptionId = params[0];

        commentMaps.toFilter.delete(subsciptionId);
        commentMaps.toSocket.delete(subsciptionId);

        receiptMaps.toFilter.delete(subsciptionId);
        receiptMaps.toSocket.delete(subsciptionId);

        highlightMaps.toFilter.delete(subsciptionId);
        highlightMaps.toSocket.delete(subsciptionId);

        ws.send(JSON.stringify(["CLOSE", subsciptionId]));
        ws.close();

        return;
      }
    },
  },
});

console.log(`Listening on ${server.hostname}:${server.port}`);
