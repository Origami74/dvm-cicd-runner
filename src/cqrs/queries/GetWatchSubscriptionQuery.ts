import type pino from "pino";
import {inject, injectable} from "tsyringe";
import {NostrEvent, NRelay, NSecSigner} from '@nostrify/nostrify';
import { Address } from '@welshman/util';
import IQuery from "../base/IQuery.ts";
import {nostrNow} from "../../utils/nostrEventUtils.ts";
import {RelayProvider} from "../../RelayProvider.ts";
import type IRelayProvider from "../../IRelayProvider.ts";
import type IQueryHandler from "../base/IQueryHandler.ts";
import {RepoWatchSubscription} from "../../RepoWatchSubscription.ts";

export class GetWatchSubscriptionQuery implements IQuery<NostrEvent | undefined> {
    repoAddress!: Address;
}

@injectable()
export class GetWatchSubscriptionQueryHandler implements IQueryHandler<GetWatchSubscriptionQuery, RepoWatchSubscription | undefined> {
    private _relay: NRelay;

    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(RelayProvider) relayProvider: IRelayProvider,
    ) {
        this._relay = relayProvider.getDefaultPool();
    }

    async execute(query: GetWatchSubscriptionQuery): Promise<RepoWatchSubscription | undefined> {
        const secretKey: string = Deno.env.get("NSEC_HEX") || ""; // TODO throw new Error("NSEC_HEX env var not set");
        const signer = new NSecSigner(secretKey);
        const signerPubkey = await signer.getPublicKey();

        var filters = [
            {
                kinds: [30001], // Generic list
                authors: [signerPubkey],
                "#d": [`repo-watch-${query.repoAddress.toNaddr()}`],
                limit: 1,
                until: nostrNow(),
            }
        ]

        for await (const msg of this._relay.req(filters, {})) {
            if (msg[0] === 'EVENT') {
                return JSON.parse(msg[2].content);
            }
            if (msg[0] === 'EOSE') {
                return undefined;
            }
        }
    }
}