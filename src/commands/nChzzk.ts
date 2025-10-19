import { Interaction, SlashCommandBuilder, TextChannel } from "discord.js";
import { CustomClient } from "../types/customClient.js";
import {
  convertName,
  StreamerKey,
  runCheck,
  filterCommands,
} from "../functions/nChzzkFunction.js";
import { checkPerformance } from "../functions/perf.js";
import { saveState } from "../functions/nChzzkPersistance.js";
import { BotState, IntervalInfo, lastStatus } from "../types/intervalInfo.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("상태")
    .setDescription(
      "멤버의 방송 상태를 확인합니다. (한번 누르면 3분마다 확인, 다시 누르면 중지)"
    )
    .addStringOption((option) =>
      option
        .setName("이름")
        .setDescription("상태를 확인할 멤버의 이름을 입력하세요.")
    ),
  async execute(interaction: Interaction, client: CustomClient) {
    if (!interaction.isChatInputCommand()) return;

    const channel: TextChannel = interaction.channel as TextChannel;

    // Interval을 새로 시작하는 경우
    if (!channel || !channel.send) {
      await channel.send({
        content: "❌ 이 명령어를 실행할 수 있는 채널 정보가 없습니다.",
      });
      return;
    }

    if (!filterCommands(interaction.options.getString("이름") || "")) {
      await interaction.reply({
        content: "❌ 사용방법에 기재 된 이름으로 입력 해주세요.",
      });
      return;
    }

    console.log(`Current WebSocket ping: ${interaction.client.ws.ping}ms`);
    const userId = interaction.user.tag;

    const key =
      interaction.channelId +
      "_" +
      (interaction.options.getString("이름") || "ALL");
    if (!client.backgroundIntervals)
      client.backgroundIntervals = new Map() as Map<string, NodeJS.Timeout>;
    if (!client.backgroundLastStatus)
      client.backgroundLastStatus = new Map() as Map<string, "OPEN" | "CLOSE">;
    if (!client.activeIntervalsInfo) client.activeIntervalsInfo = new Map();

    const memberNameRaw = interaction.options.getString("이름") as string;
    const memberName: StreamerKey | "ALL" = memberNameRaw
      ? (convertName(memberNameRaw) as StreamerKey)
      : "ALL";

    // 이미 등록된 Interval이 있는 경우
    if (client.backgroundIntervals.has(key)) {
      // Interval 중지
      const interval = client.backgroundIntervals.get(key);
      clearInterval(interval);
      client.backgroundIntervals.delete(key);
      client.backgroundLastStatus.forEach((_, k) => {
        if (k.startsWith(key)) {
          client.backgroundLastStatus.delete(k);
        }
      });
      client.backgroundLastStatusRaw.delete(key);
      client.activeIntervalsInfo.delete(key);
      const botState: BotState = {};
      botState[userId] = {
        intervals: {} as IntervalInfo,
        lastStatus: {} as lastStatus,
      };
      client.activeIntervalsInfo.set(userId, botState);
      saveState(client, userId, memberName, "delete");

      await channel.send({
        content: `✅ ${
          memberNameRaw ? `[${memberNameRaw}]` : "전체"
        } 백그라운드 상태 체크를 중지했습니다.`,
      });
      return;
    }

    // 사용자에게 Interval 시작을 알림
    await channel.send({
      content: `▶️ ${
        memberNameRaw ? `[${memberNameRaw}]` : "전체"
      } 백그라운드 상태 체크를 시작했습니다. 3분마다 상태 변경을 감지합니다.`,
    });

    const userInfo = {
      userId: interaction.user.id,
      userTag: interaction.user.tag,
    };

    checkPerformance(interaction);

    await runCheck(key, memberName, channel, userInfo, client, memberNameRaw);

    const intervalId = setInterval(() => {
      runCheck(key, memberName, channel, userInfo, client, memberNameRaw);
    }, 3 * 60 * 1000); // 3분마다 실행
    client.backgroundIntervals.set(key, intervalId);

    const intervalInfo: IntervalInfo = {
      userId: interaction.user.id,
      userTag: interaction.user.tag,
      raw: [
        {
          memberNameRaw: memberName,
          key: key,
          raw: memberNameRaw,
        },
      ],
    };

    const lastStatusEntries = client.backgroundLastStatus;
    const lastStatusRaw = client.backgroundLastStatusRaw;
    const lastStatusT = (): lastStatus => {
      let inner = {};
      if (memberName !== "ALL") {
        inner = lastStatusRaw ? lastStatusRaw : "";
      } else {
        inner = lastStatusEntries ? Object.fromEntries(lastStatusEntries) : {};
      }
      return { [memberName]: inner };
    };

    const botState: BotState = {
      [userId]: {
        intervals: intervalInfo,
        lastStatus: lastStatusT(),
      },
    };

    client.activeIntervalsInfo.set(userId, botState);
    saveState(client, userId, memberName, "add");
  },
};
