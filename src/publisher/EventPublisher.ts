import {container, inject, injectable} from "tsyringe";
import type pino from "pino";
import {NRelay, NSecSigner, NostrSigner} from '@nostrify/nostrify';
import {RelayProvider} from "../RelayProvider.ts";
import type IRelayProvider from "../IRelayProvider.ts";
import {nostrNow} from "../utils/nostrEventUtils.ts";
import IEvent from "../cqrs/base/IEvent.ts";
import IEventHandler from "../cqrs/base/IEventHandler.ts";
import {NOSTR_PRIVATE_KEY} from "../utils/env.ts";

export interface IEventPublisher {
    publish(kind: number, tags: string[][], content: string): Promise<void>
    publishDM(destPubKey: string, content: string): Promise<void>;
    publishInternal(eventName: string, event: IEvent): Promise<void>
}


@injectable()
export class EventPublisher implements IEventPublisher {

    private relay: NRelay;
    private signer: NostrSigner;

    constructor(
        @inject("Logger") private logger: pino.Logger,
        @inject(RelayProvider.name) relayProvider: IRelayProvider,
    ) {
        this.logger = logger;
        this.relay = relayProvider.getDefaultPool();
        this.signer = new NSecSigner(NOSTR_PRIVATE_KEY);
    }

    public async publish(kind: number, tags: string[][], content: string): Promise<void> {
        const signerPubkey = await this.signer.getPublicKey();

        var note = {
            kind: kind,
            pubkey: signerPubkey,
            content: content,
            created_at: nostrNow(),
            tags: tags
        }
        const envt = await this.signer.signEvent(note);

        await this.relay.event(envt)
    }

    public async publishInternal<TEvent extends IEvent>(eventName: string, event: TEvent): Promise<void> {
        const eventHandler: IEventHandler<TEvent> = container.resolve(eventName);

        // TODO: don't await, but place on a queue
        await eventHandler.execute(event);
    }

    public async publishDM(destPubKey: string, content: string): Promise<void> {
        const encryptedDmContent = await this.signer.nip04!.encrypt(destPubKey, content);

        await this.publish(4, [["p", destPubKey]], encryptedDmContent);
    }
}