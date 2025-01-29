import debug from "debug";
import "./env.ts";

// enable logging
if (!debug.enabled("NERP")) {
  debug.enable("NERP,NERP:*");
}

const logger = debug("dvm-ci");

export default logger;
