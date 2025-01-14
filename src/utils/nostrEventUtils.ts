import {NostrEvent} from '@nostrify/nostrify';

export function getParams(event: NostrEvent){
    const paramMap = event.tags
        .filter(item => item[0] === "param") // Filter arrays that start with "param"
        .reduce((map, item) => {
            const key = item[1];
            const value = item[2]; // Convert the third element to a number
            map.set(key, value);
            return map;
        }, new Map<string, string>());

    return paramMap;
}

export const nostrNow = (): number => Math.floor(Date.now() / 1000);

export function getTag(event: NostrEvent, tagName: string) : string[] {
    return event.tags.filter(item => item[0] === tagName).reduce(item => item[0]);
}

export function getTagStartingWith(event: NostrEvent, start: string) : string[][] {
    return event.tags.filter(item => item[0].startsWith(start));
}