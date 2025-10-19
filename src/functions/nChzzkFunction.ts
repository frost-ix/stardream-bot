import axios from 'axios';
import { header, pollingHeader } from '../config/header.js';
import { ApiResponse } from '../types/channels.js';
import streamers from '../data/streamers.json' with { type: 'json' };
import { EmbedBuilder, TextChannel } from 'discord.js';
import { CustomClient } from '../types/customClient.js';
import { UserInfo } from '../types/userInfo.js';

type StreamerKey = keyof typeof streamers.stardream;
const CHZZK_CHANNELS_API_URL = `${process.env.CHZZK_API_PATH}/channels/`;

async function checkChannelStatus(channelId: string): Promise<"OPEN" | "CLOSE"> {
    try {
        const response = await axios.get<ApiResponse>(
            `${CHZZK_CHANNELS_API_URL}${channelId}/live-detail`,
            {
                headers: header,
            }
        );
        return response.data.content.status as "OPEN" | "CLOSE";
    } catch (error) {
        console.error(`Error fetching channel status for ${channelId}:`, error);
        throw error;
    }
}

async function checkChannelInformation(
    channelId: string
): Promise<ApiResponse> {
    try {
        const response = await axios.get<ApiResponse>(
            `${CHZZK_CHANNELS_API_URL}/${channelId}/live-detail`,
            {
                headers: pollingHeader,
            }
        );
        return response.data;
    } catch (error) {
        console.error(
            `Error fetching channel information for ${channelId}:`,
            error
        );
        throw error;
    }
}

function isOn(
    channelId: string,
    memberName: string,
    liveStatus: string
): string {
    if (liveStatus === 'OPEN') {
        const streamerUrl = `https://chzzk.naver.com/live/${channelId}`;
        return `🟢 **[${memberName}]** 님은 현재 **방송 중**입니다!\n${streamerUrl}`;
    } else {
        return `🔴 **[${memberName}]** 님은 현재 **방송 종료 상태**입니다.`;
    }
}

function filterCommands(input: string): boolean {
  switch (input) {
      case '루네':
      case '이루네':
      case '하얀':
      case '온하얀':
      case '레이':
      case '유레이':
      case '나빈':
      case '하나빈':
      case '':
          return true;
      default:
          return false;
  }
}

function convertName(name: string): StreamerKey | null {
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

async function setEmbedBuilder(id: string, name: string) : Promise<EmbedBuilder> {
    const responseData = await checkChannelInformation(id);
    const streamerDetails = responseData.content;
    const streamerChannelInfo = responseData.content.channel;
    return new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle(`📢 ${name} 방송 시작!`)
        .addFields({ name: '방송 제목', value: streamerDetails.liveTitle || '제목 없음' })
        .addFields({ name: '카테고리', value: streamerDetails.liveCategory || '알 수 없음' })
        .setImage(streamerChannelInfo.channelImageUrl || null)
        .addFields({ name: '채널 바로가기 (PC)', value: `[치지직 PC](https://chzzk.naver.com/live/${id})` })
        .addFields({ name: '채널 바로가기 (모바일)', value: `[치지직 모바일](https://m.chzzk.naver.com/live/${id})` })
        .setTimestamp();
}

async function runCheck(key: string, memberName: StreamerKey | "ALL", channel: TextChannel, info: UserInfo, client: CustomClient, memberNameRaw: string) {
    console.log(`🔄 Running scheduled check for key ${key} at ${new Date().toISOString()}`);
      try {
        if (memberName !== "ALL" && memberName) {
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
          const prevStatus = client.backgroundLastStatusRaw
          const prev = prevStatus.get(key);

          if (prev !== liveStatus) {
            client.backgroundLastStatusRaw.set(key, liveStatus);
            if (liveStatus === 'OPEN') {
              const embedLive = await setEmbedBuilder(streamerInfo.id, streamerInfo.name);
              await channel.send({ content: `🔔 <@${info.userId}>님, [${streamerInfo.name}]님의 방송이 시작되었습니다!`, embeds: [embedLive] });
              console.log(`📡 방송 켜짐 알림 전송 완료 : ` + info.userTag);
            } else {
              await channel.send(`🌙 ${streamerInfo.name}님이 방송을 종료했습니다.`);
              console.log(`📡 방송 종료 알림 전송 완료 : ` + info.userTag);
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
              const prev = client.backgroundLastStatus.get(memberKeyFull);

              if (prev !== liveStatus) {
                client.backgroundLastStatus.set(memberKeyFull, liveStatus);
                if (liveStatus === 'OPEN') {
                  const embedLive = await setEmbedBuilder(id, name);
                  await channel.send({ content: `🔔 <@${info.userId}>님, [${name}]님의 방송이 시작되었습니다!`, embeds: [embedLive] });
                  console.log(`📡 방송 켜짐 알림 전송 완료 : ` + info.userTag);
                } else {
                  await channel.send(`🌙 ${name}님이 방송을 종료했습니다.`);
                  console.log(`📡 방송 종료 알림 전송 완료 : ` + info.userTag);
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
}
export { checkChannelStatus, isOn, filterCommands,convertName, StreamerKey, setEmbedBuilder, runCheck };
