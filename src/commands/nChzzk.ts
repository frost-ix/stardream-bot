import { EmbedBuilder, Interaction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { header, pollingHeader } from '../config/header.js';
import axios from 'axios';
import streamers from '../data/streamers.json' with { type: 'json' };
import { CustomClient } from '../types/customClient.js';
import { ApiResponse, ChannelContent, channelInfo } from '../types/channels.js';

type StreamerKey = keyof typeof streamers.stardream;
const CHZZK_CHANNELS_API_URL = `${process.env.CHZZK_API_PATH}/channels/`;

async function checkChannelStatus(channelId: string) : Promise<string> {
  try {
    const response = await axios.get<ApiResponse>(`${CHZZK_CHANNELS_API_URL}${channelId}/live-detail`, {
      headers: header,
    });
    return response.data.content.status;
  } catch (error) {
    console.error(`Error fetching channel status for ${channelId}:`, error);
    throw error;
  }
}

async function checkChannelInformation(channelId: string): Promise<ApiResponse> {
  try {
    const response = await axios.get<ApiResponse>(`${CHZZK_CHANNELS_API_URL}/${channelId}/live-detail`, {
      headers: pollingHeader,
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching channel information for ${channelId}:`, error);
    throw error;
  }
}

function isOn(channelId: string, memberName: string, liveStatus: string) : string{
  if (liveStatus === 'OPEN') {
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
      option.setName('이름').setDescription('상태를 확인할 멤버의 이름을 입력하세요.')
  ),
  // execute(interaction, client) 형태로 client를 받습니다.
  async execute(interaction: Interaction, client: CustomClient) {
    if (!interaction.isChatInputCommand()) return;

    const key = (interaction.guildId ?? interaction.channelId) + (interaction.options.getString('이름') || 'ALL');
    if (!client.backgroundIntervals) client.backgroundIntervals = new Map() as Map<string, NodeJS.Timeout>;
    if (!client.backgroundLastStatus) client.backgroundLastStatus = new Map() as Map<string, 'OPEN' | 'CLOSE'>;

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
              const liveStatus = await checkChannelStatus(streamerInfo.id); // 'OPEN' | 'CLOSE'
              const responseData = await checkChannelInformation(streamerInfo.id);
              let streamerDetails: ChannelContent;
              let streamerChannelInfo: channelInfo;
              if (liveStatus === 'OPEN') {
                streamerDetails = responseData.content;
                streamerChannelInfo = responseData.content.channel;
              } else {
                streamerDetails = new Object() as ChannelContent; // 빈 객체
                streamerChannelInfo = new Object() as channelInfo; // 빈 객체
              }
              const prev = lastStatusMap.get(key);
              if (prev !== liveStatus) {
                if (liveStatus === 'OPEN') {
                  const embedLive = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('📢 방송 시작 알림!')
                    .addFields({ name: '방송 제목', value: streamerDetails.liveTitle || '제목 없음' })
                    .addFields({ name: '카테고리', value: streamerDetails.liveCategory || '알 수 없음' })
                    .addFields({ name: '시작 시간', value: streamerDetails.openDate ? streamerDetails.openDate : '알 수 없음' })
                    .setImage(streamerChannelInfo.channelImageUrl)
                    .addFields({ name: '채널 바로가기', value: isOn(streamerInfo.id, streamerInfo.name, liveStatus) })
                    .setTimestamp();
                    channel.send({ content: `🔔 <@${interaction.user.id}>님, [${streamerInfo.name}]님의 방송이 시작되었습니다!`, embeds: [embedLive] });
                } else {
                  await channel.send(isOn(streamerInfo.id, streamerInfo.name, liveStatus) + '\n');
                }
                console.log('Status changed:', streamerInfo.name, prev, '->', liveStatus);
                // 상태 변화가 있을 때만 전송
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
                const liveStatus = await checkChannelStatus(id); // 'OPEN' | 'CLOSE'
                const responseData = await checkChannelInformation(id);
                let streamerDetails: ChannelContent
                let streamerChannelInfo: channelInfo;
                if (liveStatus === 'OPEN') {
                  streamerDetails = responseData.content;
                  streamerChannelInfo = responseData.content.channel;
                } else {
                  streamerDetails = new Object() as ChannelContent; // 빈 객체
                  streamerChannelInfo = new Object() as channelInfo; // 빈 객체
                }
                const prev = lastStatusMap.get(memberKeyFull);
                if (prev !== liveStatus) {
                  console.log('Status changed:', name, prev, '->', liveStatus);
                  // 상태 변화가 있을 때만 전송
                  if (liveStatus === 'OPEN') {
                    const embedLive = new EmbedBuilder()
                      .setColor(0x00FF00)
                      .setTitle('📢 방송 시작 알림!')
                      .addFields({ name: '방송 제목', value: streamerDetails.liveTitle || '제목 없음' })
                      .addFields({ name: '카테고리', value: streamerDetails.liveCategory || '알 수 없음' })
                      .addFields({ name: '시작 시간', value: streamerDetails.openDate ? streamerDetails.openDate : '알 수 없음' })
                      .setImage(streamerChannelInfo.channelImageUrl)
                      .addFields({ name: '채널 바로가기', value: isOn(id, name, liveStatus) })
                      .setTimestamp();
                    channel.send({ content: `🔔 <@${interaction.user.id}>님, [${name}]님의 방송이 시작되었습니다!`, embeds: [embedLive] });
                  } else {
                    channel.send(isOn(id, name, liveStatus) + '\n');
                  }
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
      runCheck(); // 타이머가 돌기 전에 1회 실행 해야됨.
      // 3분 타이머
      const intervalId = setInterval(runCheck, 3 * 60 * 1000);
      client.backgroundIntervals.set(key, intervalId);
  },
};