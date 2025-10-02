import { Interaction } from "discord.js";

function checkPerformance(interaction: Interaction) {
  if (!interaction.isChatInputCommand()) return;
  const perf = performance.now();
  console.log(
    `Interaction received: ${interaction.commandName} from ${
      interaction.user.tag
    } in ${interaction.guild?.name || "DM"}`
  );
  console.log(`Current WebSocket ping: ${interaction.client.ws.ping}ms`);
  console.log(
    `Processing time until now: ${(performance.now() - perf).toFixed(2)}ms`
  );
}
export { checkPerformance };
