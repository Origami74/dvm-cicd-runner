import {container} from "tsyringe";
import type {constructor} from "tsyringe/dist/typings/types";
import IQueryHandler from './IQueryHandler.ts';
import IEventHandler from './IEventHandler.ts';
import ICommandHandler from './ICommandHandler.ts';


export function registerCommandHandler(commandName: string, classToUse: constructor<ICommandHandler<any>>){
    container.register(commandName, {
        useClass: classToUse
    });
}

export function registerQueryHandler(queryName: string, classToUse: constructor<IQueryHandler<any, any>>){
    container.register(queryName, {
        useClass: classToUse
    });
}

export function registerEventHandler(eventName: string, classToUse: constructor<IEventHandler<any>>){
    container.register(eventName, {
        useClass: classToUse
    });
}