import {inject, injectable} from "tsyringe";
import type pino from "pino";
import ICommand from "../base/ICommand.ts";
import ICommandHandler from '../base/ICommandHandler.ts';
import {nostrNow} from "../../utils/nostrEventUtils.ts";
import {RelayProvider} from "../../RelayProvider.ts";
import type IRelayProvider from "../../IRelayProvider.ts";
import {NRelay, NSecSigner} from '@nostrify/nostrify';
import {NOSTR_PRIVATE_KEY, SERVICE_ABOUT, SERVICE_NAME} from "../../utils/env.ts";

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

        var note = {
            kind: 31989,
            pubkey: signerPubkey,
            content: `"name": "${SERVICE_NAME}", "about": "${SERVICE_ABOUT}"`,
            created_at: nostrNow(),
            tags: [
                ["k", "5900"],
                ["t", "cicd"]
            ]
        }
        const envt = await signer.signEvent(note);

        await this.relay.event(envt)
    }
}