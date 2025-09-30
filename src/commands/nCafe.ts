import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder, // Embed를 만들기 위해 import 합니다.
} from 'discord.js';
import axios from 'axios';

// --- 네이버 API 관련 타입 정의 ---
// API 응답 구조에 맞게 타입을 선언하면 코드가 더 안전해집니다.
interface CafeArticle {
    title: string;
    link: string;
    description: string;
    cafename: string;
    cafeurl: string;
}

interface NaverApiResponse {
    items: CafeArticle[];
}

// --- 네이버 카페 API 호출 함수 ---
async function getCafeArticles(
    query: string,
    display: number = 5 // 응답이 너무 길어지지 않도록 기본값을 5개로 조정
): Promise<NaverApiResponse> {
    const encodeQuery = encodeURIComponent(query);
    const headers = {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
    };
    try {
        const response = await axios.get<NaverApiResponse>(
            'https://openapi.naver.com/v1/search/cafearticle.json', // 환경변수 대신 URL 직접 사용
            {
                headers: headers,
                params: {
                    query: encodeQuery,
                    display: display,
                    sort: 'date', // 최신순으로 정렬
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching cafe articles:', error);
        // axios 에러인 경우, 더 자세한 정보를 로그로 남길 수 있습니다.
        if (axios.isAxiosError(error)) {
            console.error('Error data:', error.response?.data);
        }
        throw error; // 에러를 다시 던져서 execute에서 처리하도록 함
    }
}

// --- 명령어 정의 및 실행 ---
const cafeSearchCommand = {
    data: new SlashCommandBuilder()
        .setName('카페검색')
        .setDescription('네이버 카페 게시글을 검색합니다.')
        .addStringOption((option) =>
            option
                .setName('검색어')
                .setDescription('검색할 내용을 입력하세요.')
                .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const query = interaction.options.getString('검색어', true);
        await interaction.deferReply();

        try {
            const searchResult = await getCafeArticles(query);

            if (!searchResult.items || searchResult.items.length === 0) {
                await interaction.editReply(
                    `'${query}'에 대한 검색 결과가 없습니다.`
                );
                return;
            }

            // --- Embed 생성 ---
            const embed = new EmbedBuilder()
                .setColor(0x0099ff) // 색상 설정
                .setTitle(`"${query}" 카페 검색 결과`)
                .setDescription('최신순 5개 결과입니다.')
                .setTimestamp(); // 현재 시간 표시

            // 검색 결과 아이템들을 Embed의 필드로 추가
            searchResult.items.forEach((item) => {
                // HTML 태그를 제거하여 깔끔하게 만듭니다.
                const title = item.title.replace(/<[^>]*>/g, '');
                const description = item.description.replace(/<[^>]*>/g, '');

                embed.addFields({
                    name: title,
                    value: `[${item.cafename}](${
                        item.link
                    })\n${description.substring(0, 100)}...`, // 설명이 길 경우 자름
                });
            });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply(
                '카페 게시글을 검색하는 중 오류가 발생했습니다.'
            );
        }
    },
};

export default cafeSearchCommand;
