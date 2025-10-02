import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Interaction,
  Partials,
  Routes,
} from "discord.js";
import { CustomClient, Command } from "../types/customClient.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { findWelcomeChannel } from "../functions/general.js";
import { checkPerformance } from "../functions/perf.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

class Bot {
  private client: CustomClient;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    }) as CustomClient;

    this.client.commands = new Collection<string, Command>();
    this.client.backgroundIntervals = new Map<string, NodeJS.Timeout>();
    this.client.backgroundLastStatus = new Map<string, "OPEN" | "CLOSE">();
  }

  private async loadCommands() {
    const commandsPath = path.join(__dirname, "..", "commands");
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

    commandFiles.forEach(async (file) => {
      const filePath = path.join(commandsPath, file);
      try {
        const { default: command } = await import(filePath);
        if (command && "data" in command && "execute" in command) {
          console.log(`Loading command: ${command.data.name}`);
          this.client.commands.set(command.data.name, command);
        } else {
          console.log(
            `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
          );
        }
      } catch (error) {
        console.error(`Error loading command at ${filePath}:`, error);
      }
    });
  }

  private async registerEvents() {
    this.client.once(Events.ClientReady, (c) => {
      console.log(`Ready! Logged in as ${c.user.tag}`);
    });

    this.client.on(Events.Error, (error) => {
      console.error("The client encountered an error:", error);
    });

    this.client.on("guildCreate", (guild) => {
      const welcomeChannel = findWelcomeChannel(guild);
      console.log(`Joined a new guild: ${guild.name} (id: ${guild.id})`);

      if (welcomeChannel && welcomeChannel.isTextBased()) {
        welcomeChannel
          .send(
            "안녕하세요! 스타드림 뱅온 알리미 봇 입니다.\n" +
              "잘 부탁드립니다! 🚀\n\n" +
              "봇 사용 방법은 **`/사용방법`** 명령어를 통해 확인하실 수 있습니다."
          )
          .catch(console.error);
      } else {
        console.log(
          `Could not find a suitable channel to send a welcome message in ${guild.name}.`
        );
      }
    });

    this.client.on(
      Events.InteractionCreate,
      async (interaction: Interaction) => {
        if (!interaction.isChatInputCommand()) return;
        checkPerformance(interaction);

        const command = this.client.commands.get(interaction.commandName);

        if (!command) {
          console.error(
            `No command matching ${interaction.commandName} was found.`
          );
          await interaction.reply({
            content: "알 수 없는 명령어입니다.",
            ephemeral: true,
          });
          return;
        }

        try {
          // deferReply는 각 커맨드에서 필요에 따라 호출하도록 변경합니다.
          await interaction.deferReply({ ephemeral: true }).catch(() => {
            /* 이미 응답했거나 시간이 오래 걸리지 않는 경우 무시 */
          });
          await command.execute(interaction, this.client);
        } catch (error) {
          console.error(
            `Error executing command '${interaction.commandName}':`,
            error
          );
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
              content: "There was an error while executing this command!",
              ephemeral: true,
            });
          } else {
            await interaction.reply({
              content: "There was an error while executing this command!",
              ephemeral: true,
            });
          }
        }
      }
    );
  }

  public async start() {
    if (!DISCORD_TOKEN) {
      console.error("DISCORD_TOKEN is not set in the environment variables.");
      return;
    }

    await this.loadCommands();
    await this.registerEvents();

    try {
      console.log("Starting bot...");
      await this.client.login(DISCORD_TOKEN);

      if (this.client.user) {
        console.log("Registering application (/) commands.");
        await this.client.rest.put(
          Routes.applicationCommands(this.client.user.id),
          {
            body: this.client.commands.map((command) => command.data.toJSON()),
          }
        );
        console.log("Successfully registered application (/) commands.");
        const perf = performance.now();
        console.log(
          `Processing time until now: ${(performance.now() - perf).toFixed(
            2
          )}ms`
        );
      }
    } catch (error) {
      console.error("Error during bot startup:", error);
    }
  }
}

export default new Bot();
