export default interface IEventHandler<IEvent> {
    execute(event: IEvent): Promise<void>;
}
