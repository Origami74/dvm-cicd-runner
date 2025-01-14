import type pino from "pino";
import {inject, injectable} from "tsyringe";
import {NostrEvent, NRelay} from '@nostrify/nostrify';
import { Address } from '@welshman/util';
import IQuery from "../base/IQuery.ts";
import {nostrNow} from "../../utils/nostrEventUtils.ts";
import {RelayProvider} from "../../RelayProvider.ts";
import type IRelayProvider from "../../IRelayProvider.ts";
import type IQueryHandler from "../base/IQueryHandler.ts";

export class GetStateAnnouncementQuery implements IQuery<NostrEvent | undefined> {
    repoAddress!: Address;
    until: number = nostrNow();

}

@injectable()
export class GetStateAnnouncementQueryHandler implements IQueryHandler<GetStateAnnouncementQuery, NostrEvent | undefined> {
    private _relay: NRelay;

    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(RelayProvider) relayProvider: IRelayProvider,
    ) {
        this._relay = relayProvider.getDefaultPool();
    }

    async execute(query: GetStateAnnouncementQuery): Promise<NostrEvent | undefined> {
        var filters = [
            {
                kinds: [30618], // 30618 = State announcement
                authors: [query.repoAddress.pubkey],
                "#d": [query.repoAddress.identifier],
                limit: 1,
                until: query.until,
            }
        ]

        for await (const msg of this._relay.req(filters, {})) {
            if (msg[0] === 'EVENT') {
                return msg[2];
            }
            if (msg[0] !== 'EOSE') {
                return undefined;
            }
        }
    }
}