export default interface IEventListener {

    run(): Promise<void>;
    stop(): void;
}