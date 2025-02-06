import { nwc } from "@getalby/sdk";

export function getNwcClient(env) {
  return new nwc.NWCClient({
    nostrWalletConnectUrl: `${env.NWC_URL}?relay=${env.NWC_RELAY_URL}&secret=${env.NWC_SECRET}`,
  });
}
