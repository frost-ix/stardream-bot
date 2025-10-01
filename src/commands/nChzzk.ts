import { Interaction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { header } from '../config/header.js';
import axios from 'axios';
import streamers from '../data/streamers.json' with { type: 'json' };
import { CustomClient } from '../types/customClient.js';
import { run } from 'node:test';

type StreamerKey = keyof typeof streamers.stardream;
const CHZZK_CHANNELS_API_URL = `${process.env.CHZZK_API_PATH}/channels/`;

async function checkChannelStatus(channelId: string) : Promise<'on' | 'off'> {
  try {
    const response = await axios.get(`${CHZZK_CHANNELS_API_URL}${channelId}`, {
      headers: header,
    });
    return response.data.content.openLive ? 'on' : 'off';
  } catch (error) {
    console.error(`Error fetching channel status for ${channelId}:`, error);
    throw error;
  }
}

function isOn(channelId: string, memberName: string, liveStatus: 'on' | 'off') : string{
  if (liveStatus === 'on') {
    const streamerUrl = `https://chzzk.naver.com/live/${channelId}`;
    return `🟢 **[${memberName}]** 님은 현재 **방송 중**입니다!\n${streamerUrl}`;
  } else {
    return `🔴 **[${memberName}]** 님은 현재 **방송 종료 상태**입니다.`;
  }
}

function convertName(name: string) : StreamerKey | null {
    switch (name) {
      case '루네':
      case '이루네':
            return 'irn';
      case '하얀':
      case '온하얀':
            return 'ohy';
      case '레이':
      case '유레이':
            return 'uri';
      case '나빈':
      case '하나빈':
            return 'hnv';
      default:
            return null;
    }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('상태')
    .setDescription('멤버의 방송 상태를 확인합니다. (한번 누르면 3분마다 확인, 다시 누르면 중지)')
    .addStringOption((option) =>
      option.setName('이름').setDescription('상태를 확인할 멤버의 이름을 입력하세요.').setRequired(false)
    ),
  // execute(interaction, client) 형태로 client를 받습니다.
  async execute(interaction: Interaction, client: CustomClient) {
    if (!interaction.isChatInputCommand()) return;

    const key = (interaction.guildId ?? interaction.channelId) + (interaction.options.getString('이름') || 'ALL');
    if (!client.backgroundIntervals) client.backgroundIntervals = new Map();
    if (!client.backgroundLastStatus) client.backgroundLastStatus = new Map();

    const memberNameRaw = interaction.options.getString('이름');
    const memberName: StreamerKey | null = memberNameRaw ? convertName(memberNameRaw) as StreamerKey : null;

    if (client.backgroundIntervals.has(key)) {
      // 이미 동작중이면 중지
      const interval = client.backgroundIntervals.get(key);
      clearInterval(interval);
      console.log('Stopping background check for', key);
      client.backgroundIntervals.delete(key);
      client.backgroundLastStatus.delete(key);
      await interaction.reply({ content: `✅ ${memberNameRaw ? `[${memberNameRaw}]` : '전체'} 백그라운드 상태 체크를 중지했습니다.` });
      return;
    }

    const channel: TextChannel = interaction.channel as TextChannel;
    if (!channel || !channel.send) {
      await interaction.reply({ content: '❌ 이 명령어를 실행할 수 있는 채널 정보가 없습니다.' });
      return;
    }
    
    await interaction.reply({
        content: `▶️ ${memberNameRaw ? `[${memberNameRaw}]` : '전체'} 백그라운드 상태 체크를 시작했습니다. 3분마다 방송 상태를 확인합니다.\n` +
          `       /상태 ${memberNameRaw ? `[${memberNameRaw}]` : ''} 를 다시 입력하면 중지됩니다.`
      });

      // 상태 변화 추적용 Map (key별 마지막 상태)
      const lastStatusMap = client.backgroundLastStatus;

    const runCheck = async () => {
        try {
          if (memberName) {
            // 단일 멤버만 체크
            const streamerInfo = JSON.parse(JSON.stringify(streamers.stardream[memberName]));
            if (!streamerInfo) {
              await channel.send(`❌ **[${memberNameRaw}]** 님은 목록에 없는 멤버입니다. 다시 확인해 주세요!`);
              return;
            } else {
              const liveStatus = await checkChannelStatus(streamerInfo.id); // 'on' | 'off'
              const prev = lastStatusMap.get(key);
              console.log('Checked status for', streamerInfo.name, ':', liveStatus);
              if (prev !== liveStatus) {
                if (liveStatus === 'on') {
                  channel.send(`<@${interaction.user.id}>`);
                  channel.send('📢 방송 시작 알림!');
                  channel.send(`📢 <@${streamerInfo.name}> 님의 방송이 시작되었습니다!`);
                }
                console.log('Status changed:', streamerInfo.name, prev, '->', liveStatus);
                // 상태 변화가 있을 때만 전송
                await channel.send(isOn(streamerInfo.id, streamerInfo.name, liveStatus));
                lastStatusMap.set(key, liveStatus);
                return;
              }
            }
          } else {
            // 전체 멤버 체크
            const streamerGroup = JSON.parse(JSON.stringify(streamers.stardream));
            for (const memberKey in streamerGroup) {
              console.log('Checking status for memberKey:', memberKey);
              const { id, name } = streamerGroup[memberKey];
              const memberKeyFull = key + memberKey;
              try {
                const liveStatus = await checkChannelStatus(id); // 'on' | 'off'
                const prev = lastStatusMap.get(memberKeyFull);
                if (prev !== liveStatus) {
                  console.log('Status changed:', name, prev, '->', liveStatus);
                  // 상태 변화가 있을 때만 전송
                  if (liveStatus === 'on') {
                    channel.send(`<@${interaction.user.id}>`);
                    channel.send('📢 방송 시작 알림!');
                    channel.send(`📢 [${name}] 님의 방송이 시작되었습니다!`);
                  }
                  channel.send(isOn(id, name, liveStatus) + '\n');
                  lastStatusMap.set(memberKeyFull, liveStatus);
                }
              } catch (error) {
                // 실패시에도 상태 갱신 X, 로그만
                console.error('Error during scheduled status check:', error);
              }
            }
            return;
          }
        } catch (error) {
          console.error('Error during scheduled status check:', error);
        }
      };
    // 3분 타이머
    runCheck(); // 타이머가 돌기 전에 1회 실행 해야됨.
      const intervalId = setInterval(runCheck, 3 * 60 * 1000);
      client.backgroundIntervals.set(key, intervalId);
  },
};