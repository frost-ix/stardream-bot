import clientConfig from './clients/setClient.js';
import dotenv from 'dotenv';

dotenv.config({ debug: true });

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const client = clientConfig;

const fs = require('node:fs');
const path = require('node:path');

const startBot = async () => {
    try {
        console.log('Starting bot...\n', DISCORD_TOKEN);
        await client.login(DISCORD_TOKEN);

        client;
    } catch (error) {
        console.error('Error logging in:', error);
    }
};

startBot();
