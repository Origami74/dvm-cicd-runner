import {inject, injectable} from "tsyringe";
import type pino from "pino";
import ICommand from "../base/ICommand.ts";
import ICommandHandler from '../base/ICommandHandler.ts';
import {nostrNow} from "../../utils/nostrEventUtils.ts";
import {RelayProvider} from "../../RelayProvider.ts";
import type IRelayProvider from "../../IRelayProvider.ts";
import {NRelay, NSecSigner} from '@nostrify/nostrify';
import {
    MINT_URL,
    NOSTR_PRIVATE_KEY, PRICE_PER_SEC, PRICE_UNIT,
    SERVICE_ABOUT,
    SERVICE_NAME
} from "../../utils/env.ts";

export class PublishNip89RecommendationCommand implements ICommand {
}

@injectable()
export class PublishNip89RecommendationCommandHandler implements ICommandHandler<PublishNip89RecommendationCommand> {

    private relay: NRelay;

    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(RelayProvider.name) relayProvider: IRelayProvider,
    ) {
        this.relay = relayProvider.getDefaultPool();
    }

    async execute(command: PublishNip89RecommendationCommand): Promise<void> {
        this.logger.info("Publising NIP-89 announcement")

        const signer = new NSecSigner(NOSTR_PRIVATE_KEY);
        const signerPubkey = await signer.getPublicKey();

        const content = {
            name: SERVICE_NAME,
            about: SERVICE_ABOUT
        }

        var note = {
            kind: 31990,
            pubkey: signerPubkey,
            content: JSON.stringify(content),
            created_at: nostrNow(),
            tags: [
                ["k", "5600"],
                ["t", "high-bandwidth"],
                ["price", `${PRICE_PER_SEC}`],
                ["unit", PRICE_UNIT],
                ["mint", MINT_URL]
            ]
        }

        const envt = await signer.signEvent(note);

        await this.relay.event(envt)
    }
}