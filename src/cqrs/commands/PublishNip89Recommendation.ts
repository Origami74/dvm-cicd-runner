import {inject, injectable} from "tsyringe";
import type pino from "pino";
import ICommand from "../base/ICommand.ts";
import ICommandHandler from '../base/ICommandHandler.ts';
import {nostrNow} from "../../utils/nostrEventUtils.ts";
import {RelayProvider} from "../../RelayProvider.ts";
import type IRelayProvider from "../../IRelayProvider.ts";
import {NRelay, NSecSigner} from '@nostrify/nostrify';
import {
    NOSTR_PRIVATE_KEY,
    SERVICE_ABOUT,
    SERVICE_NAME, SPEC_RAM, SPEC_RUNNERS,
    SPEC_STORAGE,
    SPEC_STORAGE_TYPE,
    SPEC_VCPU
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
            about: SERVICE_ABOUT,
            manifest: {
                version: 1,
                runners: SPEC_RUNNERS,
                vcpu: SPEC_VCPU,
                ram: SPEC_RAM,
                storage: SPEC_STORAGE,
                storageType: SPEC_STORAGE_TYPE
            }
        }

        var note = {
            kind: 31989,
            pubkey: signerPubkey,
            content: JSON.stringify(content),
            created_at: nostrNow(),
            tags: [
                ["k", "5600"],
                ["t", "actions"]
            ]
        }

        const envt = await signer.signEvent(note);

        await this.relay.event(envt)
    }
}