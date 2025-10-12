import { Interaction, SlashCommandBuilder, TextChannel } from "discord.js";
import { CustomClient } from "../types/customClient.js";
import {
  convertName,
  StreamerKey,
  runCheck,
} from "../functions/nChzzkFunction.js";
import { checkPerformance } from "../functions/perf.js";
import { saveState } from "../functions/nChzzkPersistance.js";
import { BotState, IntervalInfo } from "../types/intervalInfo.js";

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
    console.log(`Current WebSocket ping: ${interaction.client.ws.ping}ms`);

    const key =
      (interaction.guildId ?? interaction.channelId) +
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

    const userId = interaction.user.id;

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
        [memberName]: {
          intervals: {} as IntervalInfo,
          loadInterval: new Map<string, NodeJS.Timeout>(),
          lastStatus: [],
        },
      };
      client.activeIntervalsInfo.set(userId, botState);
      saveState(client, userId, memberName);

      await interaction.reply({
        content: `✅ ${
          memberNameRaw ? `[${memberNameRaw}]` : "전체"
        } 백그라운드 상태 체크를 중지했습니다.`,
      });
      return;
    } else {
      // Interval을 새로 시작하는 경우
      const channel: TextChannel = interaction.channel as TextChannel;
      if (!channel || !channel.send) {
        await interaction.reply({
          content: "❌ 이 명령어를 실행할 수 있는 채널 정보가 없습니다.",
        });
        return;
      }

      // 사용자에게 Interval 시작을 알림
      await interaction.reply({
        content: `▶️ ${
          memberNameRaw ? `[${memberNameRaw}]` : "전체"
        } 백그라운드 상태 체크를 시작했습니다. 3분마다 상태 변경을 감지합니다.`,
      });

      checkPerformance(interaction);

      await runCheck(
        key,
        memberName,
        channel,
        interaction,
        client,
        memberNameRaw
      );
      const intervalId = setInterval(
        async () =>
          await runCheck(
            key,
            memberName,
            channel,
            interaction,
            client,
            memberNameRaw
          ),
        3 * 60 * 1000
      ); // 3분마다 실행
      client.backgroundIntervals.set(key, intervalId);

      const intervalInfo: IntervalInfo = {
        key,
        channelId: channel.id,
        userId: interaction.user.id,
        memberNameRaw: memberNameRaw ? memberNameRaw : "ALL",
      };

      const lastStatusEntries = client.backgroundLastStatus;
      const lastStatusRaw = client.backgroundLastStatusRaw;
      const lastStatus =
        memberName !== "ALL"
          ? client.backgroundLastStatus.get(key) || "CLOSE"
          : "CLOSE";
      const lastStatusT = () => {
        if (memberName !== "ALL") {
          return lastStatusRaw ? Array.from(lastStatusRaw) : [];
        } else {
          return lastStatusEntries ? Array.from(lastStatusEntries) : [];
        }
      };

      console.log("Last Status Entries:", Array.from(lastStatusEntries || []));

      const botState: BotState = {
        [userId]: {
          [memberName]: {
            intervals: intervalInfo,
            loadInterval: new Map<string, NodeJS.Timeout>([[key, intervalId]]),
            lastStatus: lastStatusT(),
          },
        },
      };

      client.activeIntervalsInfo.set(userId, botState);
      saveState(client, userId, memberName);
    }
  },
};
