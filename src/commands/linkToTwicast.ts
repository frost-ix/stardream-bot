import { ButtonBuilder, Interaction, SlashCommandBuilder } from "discord.js";
import { checkPerformance } from "../functions/perf.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("링크-트윗캐스트")
    .setDescription("멤버들의 트윗캐스트 링크를 안내합니다."),
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    checkPerformance(interaction);
    const stardreamIRUNE = new ButtonBuilder()
      .setLabel("이루네 트윗캐스트 바로가기")
      .setStyle(5)
      .setURL("https://twitcasting.tv/irune030");
    const stardreamONHAYAN = new ButtonBuilder()
      .setLabel("온하얀 트윗캐스트 바로가기")
      .setStyle(5)
      .setURL("https://twitcasting.tv/onwhite090");
    const stardreamUrei = new ButtonBuilder()
      .setLabel("유레이 트윗캐스트 바로가기")
      .setStyle(5)
      .setURL("https://twitcasting.tv/urei0w0");
    const stardreamHanavin = new ButtonBuilder()
      .setLabel("하나빈 트윗캐스트 바로가기")
      .setStyle(5)
      .setURL("https://twitcasting.tv/hanavin007");
    await interaction.reply({
      content: "멤버들의 트윗캐스트 링크는 다음과 같습니다:",
      components: [
        {
          type: 1,
          components: [
            stardreamIRUNE,
            stardreamONHAYAN,
            stardreamUrei,
            stardreamHanavin,
          ],
        },
      ],
    });
  },
};
