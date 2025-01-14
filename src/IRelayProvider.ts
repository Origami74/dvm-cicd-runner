import {NRelay} from '@nostrify/nostrify';

export default interface IRelayProvider {
    getDefaultPool(): NRelay;
}
