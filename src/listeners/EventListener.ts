import type pino from "pino";
import IEventListener from "./IEventListener.ts";
import IEventHandler from "../cqrs/base/IEventHandler.ts";
import {NostrFilter} from "https://jsr.io/@nostrify/types/0.30.0/NostrFilter.ts";
import {NRelay} from "https://jsr.io/@nostrify/types/0.30.0/NRelay.ts";
import { NostrEvent } from 'https://jsr.io/@nostrify/types/0.30.0/NostrEvent.ts';
import {NSet} from "https://jsr.io/@nostrify/nostrify/0.30.1/NSet.ts";
export class EventListener implements IEventListener {

    private running: boolean = false;
    private _relay: NRelay;
    private _logger: pino.Logger<never, boolean>;
    private _filters: NostrFilter[];
    private _eventHandler: IEventHandler<any>;

    private cacheRelay: NSet;

    constructor(
        logger: pino.Logger,
        relay: NRelay,
        filters: NostrFilter[],
        eventHandler: IEventHandler<any>
    ) {
        this._logger = logger;
        this._relay = relay;
        this._filters = filters;
        this._eventHandler = eventHandler;

        this.cacheRelay = new NSet()
    }

    public stop() {
        this._logger.warn("Stopping event listener")
        this.running = false;
    }

    public async run(){
        if(this.running){
            this._logger.warn("Run() called while event listener is already started, doing nothing...")
            return;
        }

        this.running = true;

        for await (const msg of this._relay.req(this._filters, {})) {
            if(!this.running){
                this._logger.info("stopping listener: ", this._filters)
                break;
            }

            if (msg[0] === 'EVENT') {
                await this.handle(msg[2])
                continue;
            }
            if (msg[0] !== 'EOSE') {
                this._logger.info(`${msg[0]}: ${msg[1]} - ${msg[2]}`);
            }
        }
    }

    private async handle(nostrEvent: NostrEvent) {
        if (this.cacheRelay.has(nostrEvent)) {
            return;
        }
        this.cacheRelay.add(nostrEvent);

        this._logger.info(`Handling event ${nostrEvent.id}`)

        await this._eventHandler.execute({nostrEvent: nostrEvent})
    }
}


