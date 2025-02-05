import {NostrEvent} from '@nostrify/nostrify';
import {getTags} from '@welshman/util'

export function getParams(event: NostrEvent): Map<string, string>{

    const paramTags = getTags(["param"], event.tags)

    const map: Map<string, string> = new Map();

    paramTags.forEach(([_, paramKey, paramValue]) => {

        // Ignore wrongly formatted params
        if(paramKey == undefined || paramValue == undefined){
            return;
        }

        map.set(paramKey, paramValue);
    });

    return map
}