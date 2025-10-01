import { Interaction, SlashCommandBuilder } from 'discord.js';
import { header } from '../config/header.js';
import axios from 'axios';

// 치지직 세션연결을 한 뒤 채팅 메시지를 조회 하는 슬래시 커맨드를 구현
module.exports = {
    data: new SlashCommandBuilder()
        .setName('세션연결 -- 공사중')
        .setDescription('치지직 세션 연결을 시도합니다.'),
    async execute(interaction: Interaction, client) {
        if (!interaction.isChatInputCommand()) return;
        await interaction.reply('치지직 세션 연결을 시도합니다...');

        try {
            const response = await axios.get(
                `${process.env.CHZZK_API_PATH}/session/connections`,
                {
                    headers: header,
                }
            );

            if (response.status === 200) {
                await interaction.editReply('치지직 세션 연결에 성공했습니다!');
            } else {
                await interaction.editReply(
                    `치지직 세션 연결에 실패했습니다. 상태 코드: ${response.status}`
                );
            }
        } catch (error) {
            console.error('Error connecting to Chzzk session:', error);
            await interaction.editReply(
                '치지직 세션 연결 중 오류가 발생했습니다.'
            );
        }
    },
};
