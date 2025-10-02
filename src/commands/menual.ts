// 여기서 nChzzk.ts의 사용 방법을 알려주는 slash command를 구현합니다.
import { Interaction, SlashCommandBuilder } from "discord.js";
import { checkPerformance } from "../functions/perf.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("사용방법")
    .setDescription("스티드림 봇 사용 방법을 안내합니다."),
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    console.log(`Current WebSocket ping: ${interaction.client.ws.ping}ms`);

    await interaction.deferReply(); // 응답 시간이 오래 걸릴 수 있으므로 deferReply 사용
    checkPerformance(interaction);
    await interaction.editReply(
      "# 안녕하세요 ! 스타드림 봇 입니다." +
        "\n\n" +
        "## 이 봇은 스타드림 멤버들의 방송 상태를 3분 간격으로 확인해요.\n\n" +
        "- On 이면 초록불을, Off 이면 빨간불을 표시해요.\n" +
        "- 1명 / 전원 조회가 가능해요. (예시 : /상태 이름:이루네)\n" +
        "- **이 봇은 어떠한 금전적 이득도 취하지 않습니다.**\n\n" +
        "> ### 스타드림 봇 사용 방법\n" +
        "1. /상태 명령어로 멤버의 방송 상태를 확인할 수 있습니다.\n" +
        "2. 특정 멤버의 이름을 입력하면 해당 멤버의 상태를 조회합니다.\n" +
        "3. 이름 없이 명령어를 입력하면 모든 멤버의 상태를 확인합니다.\n\n" +
        "### 멤버 이름 입력 예시:\n" +
        "> 멤버 이름 -- 키워드\n" +
        "- 이루네 --> 루네 / 이루네\n" +
        "- 온하얀 --> 하얀 / 온하얀\n" +
        "- 유레이 --> 레이 / 유레이\n" +
        "- 하나빈 --> 나빈 / 하나빈\n\n"
    );
  },
};
