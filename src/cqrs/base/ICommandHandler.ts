export default interface ICommandHandler<ICommand> {
    execute(command: ICommand): Promise<void>;
}
