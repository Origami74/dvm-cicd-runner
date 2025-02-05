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

const SPEC_RUNNERS= requiredEnv("SPEC_RUNNERS").split(",");
const SPEC_VCPU=requiredEnv("SPEC_VCPU");
const SPEC_RAM=requiredEnv("SPEC_RAM");
const SPEC_STORAGE=requiredEnv("SPEC_STORAGE");
const SPEC_STORAGE_TYPE= requiredEnv("SPEC_STORAGE_TYPE");

const MINT_URL = requiredEnv("MINT_URL");
const PRICE_PER_SEC= Number(requiredEnv("PRICE_PER_SEC"));
const PRICE_UNIT= requiredEnv("PRICE_UNIT");
const PROFIT_PAYOUT_THRESHOLD= Number(requiredEnv("PROFIT_PAYOUT_THRESHOLD"));
const PROFIT_PAYOUT_INTERVAL_SECONDS= Number(optionalEnv("PROFIT_PAYOUT_INTERVAL_SECONDS") ?? 60);
const PROFITS_PUBKEY= requiredEnv("PROFITS_PUBKEY");

const GITHUB_TOKEN = optionalEnv("GITHUB_TOKEN");
const ACT_DEFAULT_IMAGE = optionalEnv("ACT_DEFAULT_IMAGE") ?? "ubuntu-latest=catthehacker/ubuntu:act-latest";

// TODO: nscec hex

// check required env
if (NOSTR_RELAYS.length === 0) throw new Error("At least one relay is required");

export {
  NOSTR_PRIVATE_KEY_HEX,
  NOSTR_PRIVATE_KEY,
  NOSTR_RELAYS,
  SERVICE_ABOUT,
  SERVICE_NAME,
  SERVICE_PICTURE_URL,

  // ACT runner
  GITHUB_TOKEN,
  ACT_DEFAULT_IMAGE,

  SPEC_RUNNERS,
  SPEC_VCPU,
  SPEC_RAM,
  SPEC_STORAGE,
  SPEC_STORAGE_TYPE,

  // Money
  MINT_URL,
  PRICE_PER_SEC,
  PRICE_UNIT,
  PROFIT_PAYOUT_THRESHOLD,
  PROFITS_PUBKEY,
  PROFIT_PAYOUT_INTERVAL_SECONDS
};
