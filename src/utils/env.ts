import {hexToBytes} from "@noble/hashes/utils";

function requiredEnv(name: string, message?: string) {
  const value = Deno.env.get(name)
  if (value === undefined) throw new Error(message ?? `Missing environment variable: ${name}`);
  return value;
}

function optionalEnv(name: string) {
  return Deno.env.get(name);
}

// nostr
const NOSTR_PRIVATE_KEY_HEX = requiredEnv("NOSTR_PRIVATE_KEY");
const NOSTR_RELAYS = requiredEnv("NOSTR_RELAYS")?.split(",");
const NOSTR_PRIVATE_KEY = hexToBytes(NOSTR_PRIVATE_KEY_HEX);

// service config (kind 0)
const SERVICE_NAME = requiredEnv("SERVICE_NAME");
const SERVICE_ABOUT = requiredEnv("SERVICE_ABOUT");
const SERVICE_PICTURE_URL = requiredEnv("SERVICE_PICTURE_URL");


// check required env
if (NOSTR_RELAYS.length === 0) throw new Error("At least one relay is required");

export {
  NOSTR_PRIVATE_KEY,
  NOSTR_RELAYS,
  SERVICE_ABOUT,
  SERVICE_NAME,
  SERVICE_PICTURE_URL
};
