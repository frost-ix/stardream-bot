import { Routes } from 'discord.js';
import clientConfig from './clients/setClient.js';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const client = clientConfig;

const startBot = async () => {
    try {
        console.log('Starting bot...\n', DISCORD_TOKEN);
        await client.login(DISCORD_TOKEN);
        await client.rest.put(Routes.applicationCommands(client.user.id), {
            body: client.commands.map((command) => command.data.toJSON()),
        });
        console.log('Bot is online and commands are registered.');
    } catch (error) {
        console.error('Error logging in:', error);
    }
};

startBot();
