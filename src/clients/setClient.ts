import { Events, GatewayIntentBits, Partials } from "discord.js";
import { fileURLToPath } from "node:url";
import { CustomClient, Command } from "../types/customClient.js";
import fs from "node:fs";
import path from "node:path";
import { findWelcomeChannel } from "../functions/general.js";

// --- 클라이언트 설정 ---

const client = new CustomClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // 메시지 내용을 읽기 위해 필요합니다.
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// --- 동적 명령어 로딩 ---
// ../commands 폴더에서 .js 또는 .ts로 끝나는 모든 명령어 파일을 읽어옵니다.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsPath = path.join(__dirname, "../commands");

// readdirSync를 사용하여 commands 폴더 내의 파일 목록을 가져옵니다.
// .js와 .ts 파일을 모두 처리할 수 있도록 정규식을 사용합니다.
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  // import()를 사용하여 ES 모듈을 비동기적으로 가져옵니다.
  import(filePath).then((commandModule) => {
    const command: Command = commandModule.default;
    // 명령어가 유효한지 확인합니다.
    if (command && "data" in command && "execute" in command) {
      console.log(`Loading command from file: ${file}`);
      console.log(`Command name: ${command.data.name}`);
      client.commands.set(command.data.name, command);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  });
}

// --- 이벤트 핸들러 ---
client.on(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user!.tag}!`);
});

client.on(Events.Error, (error) => {
  console.error("The client encountered an error:", error);
});

// 봇이 서버에 처음 추가 됐을 때
client.on("guildCreate", (guild) => {
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

// --- 상호작용 핸들러 ---

// discord 서버와 slashCommand 상호작용 처리
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    await interaction.deferReply();
    await interaction.followUp({
      content: "Error: Command not found.",
      ephemeral: true,
    });
    return;
  }

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error("Error executing command:", error);
    await interaction.deferReply();
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
});

export default client;
