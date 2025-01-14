import IQuery from "./IQuery.ts";

export default interface IQueryHandler<TQuery extends IQuery<TResult>, TResult> {
    execute(query: TQuery): Promise<TResult>;
}
