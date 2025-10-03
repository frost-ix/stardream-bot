import {
  SlashCommandBuilder,
  Client,
  Collection,
  Interaction,
} from "discord.js";

// TypeScript를 위해 Client 클래스를 확장하여 commands 속성을 추가합니다.
export class CustomClient extends Client {
  commands: Collection<string, Command> = new Collection();
  runningCommands: Set<string> = new Set();
  activeIntervals: Map<string, NodeJS.Timeout> = new Map();
  backgroundIntervals: Map<string, NodeJS.Timeout> = new Map();
  backgroundLastStatus: Map<string, "OPEN" | "CLOSE"> = new Map();
}

// 명령어 파일의 타입을 정의합니다.
export interface Command {
  data: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute: (interaction: Interaction, client: CustomClient) => Promise<void>;
  checkLiveStatus?: (client: CustomClient) => void;
}
