import {
  ActionRowBuilder,
  ButtonBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { checkPerformance } from "../functions/perf.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("링크-카페_유튜브")
    .setDescription(
      "스티드림 멤버들의 유튜브 / 네이버 카페 링크를 안내합니다."
    ),
  async execute(interaction: any) {
    if (!interaction.isChatInputCommand()) return;
    checkPerformance(interaction);
    const starDreamCoButton = new ButtonBuilder()
      .setLabel("스타드림 공식 네이버 카페 바로가기")
      .setStyle(5) // Link style
      .setURL("https://cafe.naver.com/stardreamco");
    const iruneButton = new ButtonBuilder()
      .setLabel("이루네 유튜브 바로가기")
      .setStyle(5) // Link style
      .setURL("https://www.youtube.com/@IRUNE030");
    const onhayanButton = new ButtonBuilder()
      .setLabel("온하얀 유튜브 바로가기")
      .setStyle(5) // Link style
      .setURL("https://www.youtube.com/@ONHAYAN090");
    const yureiButton = new ButtonBuilder()
      .setLabel("유레이 유튜브 바로가기")
      .setStyle(5) // Link style
      .setURL("https://www.youtube.com/@Urei0w0");
    const hanabinButton = new ButtonBuilder()
      .setLabel("하나빈 유튜브 바로가기")
      .setStyle(5) // Link style
      .setURL("https://www.youtube.com/@hanavin007");
    const buttonRow = new ActionRowBuilder().addComponents(
      starDreamCoButton,
      iruneButton,
      onhayanButton,
      yureiButton,
      hanabinButton
    );
    await interaction.reply({
      content: "스티드림 멤버들의 유튜브 / 네이버 카페 링크는 다음과 같습니다:",
      components: [buttonRow],
    });
  },
};
