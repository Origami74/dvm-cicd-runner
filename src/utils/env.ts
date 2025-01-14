import { hexToBytes } from "@noble/hashes/utils";
import "dotenv/config";

function requiredEnv(name: string, message?: string) {
  const value = Deno.env.get(name)
  if (value === undefined) throw new Error(message ?? `Missing ${name}`);
  return value;
}

function optionalEnv(name: string) {
  return Deno.env.get(name);
}

// nostr
const NOSTR_PRIVATE_KEY_HEX = requiredEnv("PRIVATE_KEY");
const NOSTR_RELAYS = requiredEnv("NOSTR_RELAYS")?.split(",");

// service config (kind 0)
const SERVICE_NAME = requiredEnv("SERVICE_NAME");
const SERVICE_ABOUT = requiredEnv("SERVICE_ABOUT");
const SERVICE_PICTURE_URL = requiredEnv("SERVICE_PICTURE_URL");

const PRIVATE_KEY = hexToBytes(NOSTR_PRIVATE_KEY_HEX);

// check required env
if (NOSTR_RELAYS.length === 0) throw new Error("At least one relay is required");

export {
  PRIVATE_KEY,
  NOSTR_RELAYS,
  SERVICE_ABOUT,
  SERVICE_NAME,
  SERVICE_PICTURE_URL
};
