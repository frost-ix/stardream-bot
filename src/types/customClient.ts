import {
  SlashCommandBuilder,
  Client,
  Collection,
  Interaction,
} from "discord.js";
import { BotState } from "../types/intervalInfo.js";

export class CustomClient extends Client {
  commands: Collection<string, Command> = new Collection();
  runningCommands: Set<string> = new Set();
  activeIntervals: Map<string, NodeJS.Timeout> = new Map();
  backgroundIntervals: Map<string, NodeJS.Timeout> = new Map();
  backgroundLastStatus: Map<string, "OPEN" | "CLOSE"> = new Map();
  activeIntervalsInfo: Map<string, BotState> = new Map();
}

export interface Command {
  data: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute: (interaction: Interaction, client: CustomClient) => Promise<void>;
  checkLiveStatus?: (client: CustomClient) => void;
}
