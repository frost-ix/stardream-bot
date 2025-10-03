import {
  ChannelType,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Interaction,
  Partials,
  Routes,
  TextChannel,
} from "discord.js";
import { CustomClient, Command } from "../types/customClient.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { findWelcomeChannel } from "../functions/general.js";
import { replaceAnouncement } from "../functions/notice.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADMIN_USER_ID = process.env.DISCORD_BOT_ADMIN_ID;
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
    this.client.runningCommands = new Set<string>();
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

    this.client.on(Events.MessageCreate, async (message) => {
      if (message.author.bot) return;

      console.log(`📢 관리자 공지 시작: "${message.content}"`);

      const developerId = message.author.globalName + message.author.id;
      const isAdmin = developerId === ADMIN_USER_ID;

      if (isAdmin) {
        // 3. "pong!"이라고 답장합니다.
        try {
          if (message.content.length < 4) {
            console.log("전송 할 내용이 짧습니다.");
            return;
          }
          const announcement = replaceAnouncement(message.content);

          // 이 봇이 속한 모든 서버에게 최상단 채널에 announcement를 보냅니다.
          const guilds = this.client.guilds.cache;
          console.log(`📢 공지사항을 ${guilds.size}개의 서버에 보냅니다.`);
          console.log(`📢 공지 내용 --\n${announcement}`);
          console.log(guilds.map((g) => g.name).join(", "));

          guilds.forEach(async (guild) => {
            try {
              const channels = await guild.channels.fetch();
              const textChannels = channels.filter(
                (channel) =>
                  channel!.type === ChannelType.GuildText &&
                  channel!.permissionsFor(guild.members.me!).has("SendMessages")
              ) as Collection<string, TextChannel>;

              // 가장 먼저 찾은 텍스트 채널에 공지사항을 보냅니다.
              const firstTextChannel = textChannels.first();
              if (firstTextChannel) {
                await firstTextChannel.send(announcement!);
                console.log(
                  `📢 공지사항을 ${guild.name} 서버의 #${firstTextChannel.name} 채널에 보냈습니다.`
                );
              } else {
                console.log(
                  `⚠️ ${guild.name} 서버에 메시지를 보낼 수 있는 텍스트 채널이 없습니다.`
                );
              }
            } catch (error) {
              console.error(
                `⚠️ ${guild.name} 서버에 공지사항을 보내는 데 실패했습니다:`,
                error
              );
            }
          });

          await message.reply("모든 서버에 공지사항을 보냈습니다.");

          console.log("📢 관리자 공지 완료");
        } catch (error) {
          console.error("답장을 보내는 데 실패했습니다:", error);
        }
      }
    });

    this.client.on(
      Events.InteractionCreate,
      async (interaction: Interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const command = this.client.commands.get(interaction.commandName);
        const commandIdentifier = `${interaction.guildId}-${interaction.commandName}-${interaction.user.id}`;

        if (this.client.runningCommands.has(commandIdentifier)) {
          await interaction.reply({
            content:
              "이전 명령어가 아직 실행 중입니다. 잠시 후 다시 시도해주세요.",
            ephemeral: true,
          });
          return;
        }

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

        this.client.runningCommands.add(commandIdentifier);

        try {
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
        } finally {
          this.client.runningCommands.delete(commandIdentifier);
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
