import clientConfig from "./clients/setClient.js";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const client = clientConfig;

const startBot = async () => {
  try {
    console.log("Starting bot...\n", DISCORD_TOKEN);
    await client.login(DISCORD_TOKEN);
  } catch (error) {
    console.error("Error logging in:", error);
  }
};

startBot();
