import {
    Client,
    Collection,
    Events,
    GatewayIntentBits,
    Partials,
    Interaction,
    Message,
    SlashCommandBuilder,
} from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// TypeScript를 위해 Client 클래스를 확장하여 commands 속성을 추가합니다.
class CustomClient extends Client {
    commands: Collection<string, Command> = new Collection();
}

// 명령어 파일의 타입을 정의합니다.
interface Command {
    data: Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
    execute: (interaction: Interaction) => Promise<void>;
}

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
const commandsPath = path.join(__dirname, '../commands');

// readdirSync를 사용하여 commands 폴더 내의 파일 목록을 가져옵니다.
// .js와 .ts 파일을 모두 처리할 수 있도록 정규식을 사용합니다.
const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.js') || file.endsWith('.ts'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    // import()를 사용하여 ES 모듈을 비동기적으로 가져옵니다.
    import(filePath).then((commandModule) => {
        const command: Command = commandModule.default;
        // 명령어가 유효한지 확인합니다.
        if (command && 'data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(
                `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
            );
        }
    });
}

// --- 이벤트 핸들러 ---

// 클라이언트가 준비되었을 때 한 번만 실행됩니다.
client.once(Events.ClientReady, async (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);

    // 슬래시 명령어를 등록합니다.
    try {
        const commandsData = client.commands.map((cmd) => cmd.data);
        if (client.application) {
            await client.application.commands.set(commandsData);
            console.log('Successfully registered application (/) commands.');
        }
    } catch (error) {
        console.error('Error registering application commands:', error);
    }
});

// 상호작용(interaction)이 생성되었을 때 실행됩니다.
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(
            `No command matching ${interaction.commandName} was found.`
        );
        await interaction.reply({
            content: 'Error: Command not found.',
            ephemeral: true,
        });
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error('Error executing command:', error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: 'There was an error while executing this command!',
                ephemeral: true,
            });
        } else {
            await interaction.reply({
                content: 'There was an error while executing this command!',
                ephemeral: true,
            });
        }
    }
});

// 메시지가 생성되었을 때 실행됩니다.
client.on(Events.MessageCreate, (msg: Message) => {
    // 봇 자신의 메시지는 무시합니다.
    if (msg.author.bot) return;

    console.log(`Message from ${msg.author.tag}: ${msg.content}`);

    if (msg.content === '핑') {
        msg.reply('퐁!');
    }
});

export default client;
