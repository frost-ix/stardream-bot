import { Interaction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { CustomClient } from '../types/customClient.js';
import { checkChannelStatus, convertName, StreamerKey, setEmbedBuilder } from '../functions/nChzzkFunction.js';
import { checkPerformance } from '../functions/perf.js';
import streamers from '../data/streamers.json' with { type: 'json' };
import { loadState, saveState } from '../functions/nChzzkPersistance.js';
import { BotState, IntervalInfo } from '../types/intervalInfo.js';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('상태')
    .setDescription('멤버의 방송 상태를 확인합니다. (한번 누르면 3분마다 확인, 다시 누르면 중지)')
    .addStringOption((option) =>
      option.setName('이름').setDescription('상태를 확인할 멤버의 이름을 입력하세요.')
  ),
  async execute(interaction: Interaction, client: CustomClient) {
    if (!interaction.isChatInputCommand()) return;
    console.log(`Current WebSocket ping: ${interaction.client.ws.ping}ms`);

    const key = (interaction.guildId ?? interaction.channelId) + (interaction.options.getString('이름') || 'ALL');
    if (!client.backgroundIntervals) client.backgroundIntervals = new Map() as Map<string, NodeJS.Timeout>;
    if (!client.backgroundLastStatus) client.backgroundLastStatus = new Map() as Map<string, 'OPEN' | 'CLOSE'>;
    if (!client.activeIntervalsInfo) client.activeIntervalsInfo = new Map();

    const memberNameRaw = interaction.options.getString('이름') as string;
    const memberName: StreamerKey | "ALL" = memberNameRaw ? convertName(memberNameRaw) as StreamerKey : "ALL";

    const userId = interaction.user.id;

    // 이미 등록된 Interval이 있는 경우
    if (client.backgroundIntervals.has(key)) {
      // Interval 중지
      const interval = client.backgroundIntervals.get(key);
      clearInterval(interval);
      client.backgroundIntervals.delete(key);
      client.backgroundLastStatus.delete(key);
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

      await interaction.reply({ content: `✅ ${memberNameRaw ? `[${memberNameRaw}]` : '전체'} 백그라운드 상태 체크를 중지했습니다.` });
      return;
    }

    // Interval을 새로 시작하는 경우
    const channel: TextChannel = interaction.channel as TextChannel;
    if (!channel || !channel.send) {
      await interaction.reply({ content: '❌ 이 명령어를 실행할 수 있는 채널 정보가 없습니다.' });
      return;
    }

    // 사용자에게 Interval 시작을 알림
    await interaction.reply({ content: `▶️ ${memberNameRaw ? `[${memberNameRaw}]` : '전체'} 백그라운드 상태 체크를 시작했습니다. 3분마다 상태 변경을 감지합니다.` });

    const lastStatusMap = client.backgroundLastStatus;

    const runCheck = async () => {
      try {
        if (memberName !== "ALL") {
          // 단일 멤버 체크
          const streamerInfo = JSON.parse(JSON.stringify(streamers.stardream[memberName]));
          if (!streamerInfo) {
            await channel.send(`❌ **[${memberNameRaw}]** 님은 목록에 없는 멤버입니다. (자동 체크 중지)`);
            // Interval 중지
            const intervalToStop = client.backgroundIntervals.get(key);
            if (intervalToStop) {
              clearInterval(intervalToStop);
              client.backgroundIntervals.delete(key);
              client.backgroundLastStatus.delete(key);
            }
            return;
          }
          
          const liveStatus = await checkChannelStatus(streamerInfo.id);
          const prev = lastStatusMap.get(key);

          if (prev !== liveStatus) {
            lastStatusMap.set(key, liveStatus);
            if (liveStatus === 'OPEN') {
              const embedLive = await setEmbedBuilder(streamerInfo.id, streamerInfo.name);
              channel.send({ content: `🔔 <@${interaction.user.id}>님, [${streamerInfo.name}]님의 방송이 시작되었습니다!`, embeds: [embedLive] });
              console.log(`📡 방송 켜짐 알림 전송 완료 : ` + interaction.user.tag);
            } else {
              channel.send(`🌙 ${streamerInfo.name}님이 방송을 종료했습니다.`);
              console.log(`📡 방송 종료 알림 전송 완료 : ` + interaction.user.tag);
            }
          }
        } else {
          // 전체 멤버 체크
          const streamerGroup = JSON.parse(JSON.stringify(streamers.stardream));
          for (const memberKey in streamerGroup) {
            const { id, name } = streamerGroup[memberKey];
            const memberKeyFull = key + memberKey;
            
            try {
              const liveStatus = await checkChannelStatus(id);
              const prev = lastStatusMap.get(memberKeyFull);

              if (prev !== liveStatus) {
                lastStatusMap.set(memberKeyFull, liveStatus);
                if (liveStatus === 'OPEN') {
                  const embedLive = await setEmbedBuilder(id, name);
                  channel.send({ content: `🔔 <@${interaction.user.id}>님, [${name}]님의 방송이 시작되었습니다!`, embeds: [embedLive] });
                  console.log(`📡 방송 켜짐 알림 전송 완료 : ` + interaction.user.tag);
                } else {
                  channel.send(`🌙 ${name}님이 방송을 종료했습니다.`);
                  console.log(`📡 방송 종료 알림 전송 완료 : ` + interaction.user.tag);
                }
              }
            } catch (error) {
              console.error(`Error checking status for ${name}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('Error during scheduled status check:', error);
      }
    };

    checkPerformance(interaction);

    runCheck(); // 시작 시 1회 즉시 실행
    const intervalId = setInterval(runCheck, 3 * 60 * 1000); // 3분마다 실행
    client.backgroundIntervals.set(key, intervalId);

    const intervalInfo: IntervalInfo = {
      key,
      channelId: channel.id,
      userId: interaction.user.id,
      memberNameRaw: memberNameRaw,
    };

    const lastStatus = memberName !== "ALL" ? (lastStatusMap.get(key) || 'CLOSE') : 'CLOSE';

    console.log("status:", lastStatusMap);

    const lastStatusEntries = lastStatusMap.entries();

    const botState: BotState = {
      [userId]: {
        [memberName]: {
          intervals: intervalInfo,
          loadInterval: new Map<string, NodeJS.Timeout>([[key, intervalId]]),
          lastStatus: lastStatusEntries ? Array.from(lastStatusEntries) : [[key, lastStatus]]
        },
      }
    };

    console.log("botState:", botState);

    client.activeIntervalsInfo.set(userId, botState);
    saveState(client, userId, memberName);
  },
};