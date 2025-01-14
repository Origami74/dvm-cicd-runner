import {inject, injectable} from "tsyringe";
import type pino from "pino";
import IEventListener from "./IEventListener.ts";
import {IEventListenerRegistry} from "./IEventListenerRegistry.ts";
import IEventHandler from "../cqrs/base/IEventHandler.ts";
import IEvent from "../cqrs/base/IEvent.ts";
import { EventListener } from './EventListener.ts';
import {RelayProvider} from "../RelayProvider.ts";
import type IRelayProvider from "../IRelayProvider.ts";
import { NRelay, NostrFilter } from '@nostrify/nostrify';

@injectable()
export class EventListenerRegistry implements IEventListenerRegistry {

    private logger: pino.Logger;
    private listeners: { [id: string] : IEventListener; } = {};
    private _relay: NRelay;

    constructor(
        @inject("Logger") logger: pino.Logger,
        @inject(RelayProvider) relayProvider: IRelayProvider,
    ) {
        this.logger = logger;
        this._relay = relayProvider.getDefaultPool();
    }

    public add<T extends IEvent>(id: string, filters: NostrFilter[], eventHandler: IEventHandler<T>) {
        var listener = new EventListener(this.logger, this._relay, filters, eventHandler);

        this.listeners[id] = listener;

        listener.run();
    }

    public remove(id: string){
        if(!this.exists(id)){
            return;
        }
        const listener = this.listeners[id];

        listener.stop();

        delete this.listeners[id];
    }

    public exists(id: string) {
        return id in this.listeners;
    }
}