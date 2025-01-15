import {container, inject, injectable} from "tsyringe";
import type pino from "pino";
import {NRelay, NSecSigner} from '@nostrify/nostrify';
import {RelayProvider} from "../RelayProvider.ts";
import type IRelayProvider from "../IRelayProvider.ts";
import {nostrNow} from "../utils/nostrEventUtils.ts";
import IEvent from "../cqrs/base/IEvent.ts";
import IEventHandler from "../cqrs/base/IEventHandler.ts";
import {NOSTR_PRIVATE_KEY} from "../utils/env.ts";

export interface IEventPublisher {
    publish(kind: number, tags: string[][], content: string): Promise<void>
    publishInternal(eventName: string, event: IEvent): Promise<void>
}


@injectable()
export class EventPublisher implements IEventPublisher {

    private relay: NRelay;
    private logger: pino.Logger;

    constructor(
        @inject("Logger") logger: pino.Logger,
        @inject(RelayProvider.name) relayProvider: IRelayProvider,
    ) {
        this.logger = logger;
        this.relay = relayProvider.getDefaultPool();

    }

    public async publish(kind: number, tags: string[][], content: string): Promise<void> {
        const signer = new NSecSigner(NOSTR_PRIVATE_KEY);
        const signerPubkey = await signer.getPublicKey();

        var note = {
            kind: kind,
            pubkey: signerPubkey,
            content: content,
            created_at: nostrNow(),
            tags: tags
        }
        const envt = await signer.signEvent(note);

        await this.relay.event(envt)
    }

    public async publishInternal<TEvent extends IEvent>(eventName: string, event: TEvent): Promise<void> {
        const eventHandler: IEventHandler<TEvent> = container.resolve(eventName);

        // TODO: don't await, but place on a queue
        await eventHandler.execute(event);
    }
}