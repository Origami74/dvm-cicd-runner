import {inject, injectable} from "tsyringe";
import type pino from "pino";
import IRelayProvider from "./IRelayProvider.ts";
import { NRelay1, NPool } from '@nostrify/nostrify';
import {NOSTR_RELAYS} from "./utils/env.ts";

@injectable()
export class RelayProvider implements IRelayProvider {

    private logger: pino.Logger;
    private pool: NPool;

    constructor(
        @inject("Logger") logger: pino.Logger,
    ) {
        this.logger = logger;

        this.pool = new NPool({
            open(url) {
                return new NRelay1(url);
            },
            reqRouter: async (filters) => {
                return new Map(NOSTR_RELAYS.map((relay) => {
                    return [relay, filters];
                }));
            },
            eventRouter: async event => {
                return NOSTR_RELAYS;
            },
        });
    }

    getDefaultPool(): NPool {
        return this.pool;
    }
}