import {NPool} from '@nostrify/nostrify';

export default interface IRelayProvider {
    getDefaultPool(): NPool;
}
