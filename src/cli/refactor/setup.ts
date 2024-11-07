import { Logger } from "../../utils/logger.js";
import { ICommand } from "../drpm.js";

export class SetupCommand implements ICommand {
  public async execute(options: any) {
    Logger.debug("Setting up DRPM...", options);
    throw new Error("Not implemented");
  }
}
