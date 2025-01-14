import {inject, injectable} from "tsyringe";
import type pino from "pino";
import IRelayProvider from "./IRelayProvider.ts";
import { NRelay1, NPool } from '@nostrify/nostrify';

@injectable()
export class RelayProvider implements IRelayProvider {

    private logger: pino.Logger;
    private pool: NPool;

    constructor(
        @inject("Logger") logger: pino.Logger,
    ) {
        this.logger = logger;

        const relays = [
            'wss://nos.lol',
            'wss://relay.damus.io',
            'wss://relay.primal.net',
            'wss://relay.stens.dev',
        ];

        this.pool = new NPool({
            open(url) {
                return new NRelay1(relays[0]);
            },
            reqRouter: async (filters) => {
                return new Map(relays.map((relay) => {
                    return [relay, filters];
                }));
            },
            eventRouter: async event => {
                return relays;
            },
        });
    }

    getDefaultPool(): NPool {
        return this.pool;
    }
}