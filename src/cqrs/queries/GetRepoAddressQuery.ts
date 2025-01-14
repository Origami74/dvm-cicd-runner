import type pino from "pino";
import {inject, injectable} from "tsyringe";
import {NostrEvent, NRelay} from '@nostrify/nostrify';
import { Address } from '@welshman/util';
import IQuery from "../base/IQuery.ts";
import {nostrNow} from "../../utils/nostrEventUtils.ts";
import {RelayProvider} from "../../RelayProvider.ts";
import type IRelayProvider from "../../IRelayProvider.ts";
import type IQueryHandler from "../base/IQueryHandler.ts";

export class GetRepoAddressQuery implements IQuery<Address | undefined> {
    pubkey!: string;
    identifier!: string;

}

@injectable()
export class GetRepoAddressQueryHandler implements IQueryHandler<GetRepoAddressQuery, Address | undefined> {
    private _relay: NRelay;

    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(RelayProvider) relayProvider: IRelayProvider,
    ) {
        this._relay = relayProvider.getDefaultPool();
    }

    async execute(query: GetRepoAddressQuery): Promise<Address | undefined> {
        var filters = [
            {
                kinds: [30617], // 30617 = Repository announcement
                authors: [query.pubkey],
                "#d": [query.identifier],
                limit: 1,
                until: nostrNow(),
            }
        ]

        for await (const msg of this._relay.req(filters, {})) {
            if (msg[0] === 'EVENT') {
                return Address.fromEvent(msg[2]);
            }
            if (msg[0] !== 'EOSE') {
                return undefined;
            }
        }
    }
}