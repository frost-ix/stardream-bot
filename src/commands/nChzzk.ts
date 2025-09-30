import { header } from '../config/header.js';
import { ApiResponse } from '../types/channels.js';
import {
    CommandInteraction,
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    CacheType,
} from 'discord.js';
import streamers from '../data/streamers.json' with { type: 'json' };
import axios from 'axios';

interface StreamersData {
    stardream: {
        [key: string]: { id: string; name: string };
    };
    [key: string]: any;
}

const CHZZK_CHANNELS_API_URL = `${process.env.CHZZK_API_PATH}/channels/`;

async function checkChannelStatus(channelId: string): Promise<string> {
    try {
        const response = await axios.get<ApiResponse>(
            `${CHZZK_CHANNELS_API_URL}${channelId}`,
            {
                headers: header,
            }
        );
        // API 응답에서 openLive가 true이면 'on', 아니면 'off' 반환
        console.log(response.data.content.openLive);
        return response.data.content.openLive ? 'on' : 'off';
    } catch (error) {
        // API 요청 중 에러 발생 시 콘솔에 로그를 남기고 에러를 다시 던집니다.
        console.error(`Error fetching channel status for ${channelId}:`, error);
        throw error;
    }
}

function isOn(
    channelId: string,
    memberName: string,
    liveStatus: string
) {
    if (liveStatus === 'on') {
        const streamerUrl = `https://chzzk.naver.com/live/${channelId}`;
        return `🟢 **[${memberName}]** 님은 현재 **방송 중**입니다!\n${streamerUrl}`;
    } else {
        return `🔴 **[${memberName}]** 님은 현재 **방송 종료 상태**입니다.`;
    }
}

async function handleSingleMember(
    interaction: ChatInputCommandInteraction<CacheType>,
    memberName: string
) {
    // streamers.json에서 stardream 객체를 가져옵니다.
    const streamerGroup = (streamers as StreamersData).stardream;
    const streamerInfo = streamerGroup[memberName];

    if (!streamerInfo) {
        await interaction.editReply(
            `❌ **[${memberName}]** 님은 목록에 없는 멤버입니다. 다시 확인해 주세요!`
        );
        return;
    }

    const { id, name } = streamerInfo;
    try {
        const liveStatus = await checkChannelStatus(id);
        const apiResponse = await axios.get<ApiResponse>(
            `${CHZZK_CHANNELS_API_URL}${id}`,
            { headers: header }
        );
        await interaction.editReply(isOn(id, name, liveStatus));
    } catch {
        await interaction.editReply(
            `❓ **[${name}]** 님의 상태를 확인할 수 없습니다.`
        );
    }
}

async function handleAllMembers(
    interaction: ChatInputCommandInteraction<CacheType>
) {
    const streamerGroup = (streamers as StreamersData).stardream;
    let replyMessage = '현재 방송 상태:\n';

    // 모든 멤버의 상태를 순차적으로 확인합니다.
    for (const memberKey in streamerGroup) {
        const { id, name } = streamerGroup[memberKey];
        try {
            const liveStatus = await checkChannelStatus(id);
            const apiResponse = await axios.get<ApiResponse>(
                `${CHZZK_CHANNELS_API_URL}${id}`,
                { headers: header }
            );
            replyMessage += isOn(id, name, liveStatus) + '\n';
        } catch (error) {
            replyMessage += `❓ **[${name}]** 님의 상태를 확인할 수 없습니다.\n`;
        }
    }
    await interaction.editReply(replyMessage);
}

// Command Module Export
export default {
    data: new SlashCommandBuilder()
        .setName('상태')
        .setDescription('멤버의 방송 상태를 확인합니다.')
        .addStringOption((option) =>
            option
                .setName('이름')
                .setDescription('상태를 확인할 멤버의 이름을 입력하세요.')
                // 이름을 입력하지 않으면 전체 멤버를 조회하도록 false로 설정
                .setRequired(false)
        ),
    async execute(interaction: CommandInteraction) {
        // isChatInputCommand 타입 가드를 통해 ChatInputCommandInteraction으로 타입을 좁힙니다.
        if (!interaction.isChatInputCommand()) return;

        await interaction.deferReply();

        const memberName = interaction.options.getString('이름');

        if (memberName) {
            // 특정 멤버의 상태를 확인
            await handleSingleMember(interaction, memberName);
        } else {
            // 모든 멤버의 상태를 확인
            await handleAllMembers(interaction);
        }
    },
};