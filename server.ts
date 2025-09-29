import { Client, Events, GatewayIntentBits } from 'discord.js';
import { token } from './config.json';

const BOT_TOKEN = token;
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return; // 봇의 메시지는 무시
    if (message.content === 'ping') {
        message.channel.send('pong');
    }
});

const startBot = async () => {
    try {
        await client.login(BOT_TOKEN);
    } catch (error) {
        console.error('Error logging in:', error);
    }
};

startBot();
