import { Events, GatewayIntentBits, Partials } from "discord.js";
import { fileURLToPath } from "node:url";
import { CustomClient, Command } from "../types/customClient.js";
import fs from "node:fs";
import path from "node:path";

const client = new CustomClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // 메시지 내용을 읽기 위해 필요합니다.
  ],
  partials: [Partials.Channel],
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
    console.log(`Loading command from file: ${file}`);
    console.log(`Command name: ${command.data.name}`);
    // 명령어가 유효한지 확인합니다.
    client.commands.set(command.data.name, command);
    if (command && "data" in command && "execute" in command) {
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  });
}

// --- 이벤트 핸들러 ---
client.on(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on(Events.Error, (error) => {
  console.error("The client encountered an error:", error);
});

// 클라이언트가 준비되었을 때 한 번만 실행됩니다.
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    await interaction.reply({
      content: "Error: Command not found.",
      ephemeral: true,
    });
    return;
  }

  try {
    // execute 시 client를 같이 전달합니다.
    await command.execute(interaction, client);
  } catch (error) {
    console.error("Error executing command:", error);
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

client.on(Events.MessageCreate, async (message) => {
  // 봇의 메시지에는 반응하지 않도록 합니다.
  if (message.author.bot) return;

  // 메시지 내용이 특정 키워드를 포함하는지 확인합니다.
  if (message.content.includes("안녕")) {
    await message.channel.send(`안녕하세요, ${message.author.username}님!`);
  }
});

export default client;
