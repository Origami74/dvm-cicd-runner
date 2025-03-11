import {inject, injectable} from "tsyringe";
import type pino from "pino";
import ICommand from "../base/ICommand.ts";
import ICommandHandler from '../base/ICommandHandler.ts';
import {nostrNow} from "../../utils/nostrEventUtils.ts";
import {RelayProvider} from "../../RelayProvider.ts";
import type IRelayProvider from "../../IRelayProvider.ts";
import {NRelay, NSecSigner} from '@nostrify/nostrify';
import { generateSecretKey } from 'nostr-tools/pure'

export class PublishDmCommand implements ICommand {
    public pubkey!: string;
    public message!: string
}

@injectable()
export class PublishDmCommandHandler implements ICommandHandler<PublishDmCommand> {

    private relay: NRelay;

    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(RelayProvider.name) relayProvider: IRelayProvider,
    ) {
        this.relay = relayProvider.getDefaultPool();
    }

    async execute(command: PublishDmCommand): Promise<void> {
        this.logger.info("Publising DM announcement")

        const signer = new NSecSigner(generateSecretKey());
        const signerPubkey = await signer.getPublicKey();

        const encryptedContent = await signer.nip04.encrypt(command.pubkey, command.message);
        var note = {
            kind: 4,
            pubkey: signerPubkey,
            content: encryptedContent,
            created_at: nostrNow(),
            tags: [
                ["p", command.pubkey],
            ]
        }

        const envt = await signer.signEvent(note);

        await this.relay.event(envt)
    }
}