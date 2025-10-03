import axios from 'axios';
import { header, pollingHeader } from '../config/header.js';
import { ApiResponse } from '../types/channels.js';
import streamers from '../data/streamers.json' with { type: 'json' };
import { EmbedBuilder } from 'discord.js';

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
export { checkChannelStatus, isOn, convertName, StreamerKey, setEmbedBuilder };
