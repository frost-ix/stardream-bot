import { Interaction, SlashCommandBuilder } from "discord.js";
import { checkPerformance } from "../functions/perf.js";
import { CustomClient } from "../types/customClient.js";
import { checkXId } from "../functions/xFunction.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("x스페이스")
    .setDescription("스티드림 멤버들의 최근 스페이스 3개를 검색합니다.")
    .addStringOption((option) =>
      option
        .setName("이름")
        .setDescription("확인할 멤버의 이름을 입력하세요.")
        .setRequired(true)
    ),
  async execute(interaction: Interaction, client: CustomClient) {
    if (!interaction.isChatInputCommand()) return;

    const key: string = interaction.options!.getString("이름")!;
    const xId = checkXId(key);
    const targetUrl: string =
      process.env.X_SEARCH_SPACES_URL + xId + process.env.X_SEARCH_TYPE;

    if (xId) {
      await interaction.reply(
        `🔗 [${key}] 님의 최근 스페이스 3개 검색 링크\n\n${targetUrl}`
      );
    } else {
      await interaction.reply(`❌ [${key}] 님은 스타드림 멤버가 아닙니다 !`);
    }

    checkPerformance(interaction);
  },
};
