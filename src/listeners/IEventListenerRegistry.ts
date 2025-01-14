import IEvent from "../cqrs/base/IEvent.ts";
import IEventHandler from "../cqrs/base/IEventHandler.ts";
import {NostrFilter} from "@nostrify/nostrify";

export interface IEventListenerRegistry {
    add<T extends IEvent>(id: string, filters: NostrFilter[], eventHandler: IEventHandler<T>): void;
    remove(id: string): void
    exists(id: string): boolean
}