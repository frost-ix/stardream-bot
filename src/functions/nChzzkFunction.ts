import axios from 'axios';
import { header, pollingHeader } from '../config/header.js';
import { ApiResponse } from '../types/channels.js';
import streamers from '../data/streamers.json' with { type: 'json' };

type StreamerKey = keyof typeof streamers.stardream;
const CHZZK_CHANNELS_API_URL = `${process.env.CHZZK_API_PATH}/channels/`;

async function checkChannelStatus(channelId: string): Promise<string> {
    try {
        const response = await axios.get<ApiResponse>(
            `${CHZZK_CHANNELS_API_URL}${channelId}/live-detail`,
            {
                headers: header,
            }
        );
        return response.data.content.status;
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
export { checkChannelStatus, checkChannelInformation, isOn, convertName, StreamerKey };
