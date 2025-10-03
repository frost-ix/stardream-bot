import {
  ActionRowBuilder,
  ButtonBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { checkPerformance } from "../functions/perf.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("링크-x")
    .setDescription("스티드림 멤버들의 X(구 트위터) 링크를 안내합니다."),
  async execute(interaction: any) {
    if (!interaction.isChatInputCommand()) return;
    checkPerformance(interaction);
    const starDreamCoButton = new ButtonBuilder()
      .setLabel("스타드림 공식 X 계정 바로가기")
      .setStyle(5) // Link style
      .setURL("https://x.com/STARDREAM_CO");
    const iruneButton = new ButtonBuilder()
      .setLabel("이루네 X 계정 바로가기")
      .setStyle(5) // Link style
      .setURL("https://x.com/irune030");
    const onhayanButton = new ButtonBuilder()
      .setLabel("온하얀 X 계정 바로가기")
      .setStyle(5) // Link style
      .setURL("https://x.com/onwhite090");
    const yureiButton = new ButtonBuilder()
      .setLabel("유레이 X 계정 바로가기")
      .setStyle(5) // Link style
      .setURL("https://x.com/Urei0w0");
    const hanabinButton = new ButtonBuilder()
      .setLabel("하나빈 X 계정 바로가기")
      .setStyle(5) // Link style
      .setURL("https://x.com/hanavin007");
    const buttonRow = new ActionRowBuilder().addComponents(
      starDreamCoButton,
      iruneButton,
      onhayanButton,
      yureiButton,
      hanabinButton
    );
    await interaction.reply({
      content: "스티드림 멤버들의 X(구 트위터) 링크는 다음과 같습니다:",
      components: [buttonRow],
    });
  },
};
