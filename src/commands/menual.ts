// 여기서 nChzzk.ts의 사용 방법을 알려주는 slash command를 구현합니다.
import { Interaction, SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("사용방법")
    .setDescription("스티드림 봇 사용 방법을 안내합니다.")
    .addStringOption((option) =>
      option.setName("option").setDescription("옵션입니다.").setRequired(false)
    ),
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    await interaction.reply(
      "스타드림 봇 사용 방법:\n" +
        "1. /상태 명령어로 멤버의 방송 상태를 확인할 수 있습니다.\n" +
        "2. 특정 멤버의 이름을 입력하면 해당 멤버의 상태를 조회합니다.\n" +
        "3. 이름 없이 명령어를 입력하면 모든 멤버의 상태를 주기적으로 확인합니다.\n\n" +
        "멤버 이름 예시:\n" +
        "- 루네\n" +
        "- 하얀\n" +
        "- 레이\n" +
        "- 나빈"
    );
  },
};
