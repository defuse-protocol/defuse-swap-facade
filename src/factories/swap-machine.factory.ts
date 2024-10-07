import {
  type AnyEventObject,
  type MachineConfig,
  type MachineContext,
  setup,
} from "xstate";

type MachineSetup<
  TContext extends MachineContext,
  TEvents extends AnyEventObject,
  TInput,
  // biome-ignore lint/suspicious/noExplicitAny: <reason>
> = ReturnType<any>;

export class SwapMachineFactory<
  TContext extends MachineContext,
  TEvents extends AnyEventObject,
  TInput,
> {
  private machineSetup: MachineSetup<TContext, TEvents, TInput>;
  constructor(setup: MachineSetup<TContext, TEvents, TInput>) {
    this.machineSetup = setup;
  }

  // biome-ignore lint/suspicious/noExplicitAny: <reason>
  createMachine(definition: MachineConfig<TContext, any, any>) {
    // biome-ignore lint/suspicious/noExplicitAny: <reason>
    return setup(this.machineSetup).createMachine(definition as any);
  }
}
