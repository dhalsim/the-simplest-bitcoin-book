import { Server } from "bun";

export function fetch(req: Request, server: Server) {
  if (req.headers.get("Accept") === "application/nostr+json") {
    const relayInfo = {
      name: "Nostrize Relay",
      description: "This is a Nostr relay for the Nostrize project.",
      pubkey: "your_public_key_here",
      contact: "contact_email_or_alternate_info",
      supported_nips: [1, 2, 3, 5],
      software: "https://github.com/nostrize/relay",
      version: "1.0.0",
    };

    return new Response(JSON.stringify(relayInfo), {
      headers: {
        "Content-Type": "application/nostr+json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Accept",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  }

  const success = server.upgrade(req);

  if (success) {
    return;
  }

  return new Response("505 Error", { status: 505 });
}
