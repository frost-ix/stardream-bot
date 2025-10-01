/**
 * 치지직 API 응답 타입 정의
 * - ApiResponse: API 응답 전체 구조
 * - ChannelContent: 채널 정보 구조
 * - SubscriptionPaymentAvailability: 구독 결제 가능 여부 구조
 */

// ------------------------------------------------------
// 치지직 API 응답 타입 정의
// ------------------------------------------------------
interface SubscriptionPaymentAvailability {
    iapAvailability: boolean;
    iabAvailability: boolean;
}

/**
 * 채널 정보 타입 지정
 * - liveId: 라이브 ID
 * - liveTitle: 라이브 제목
 * - status: 라이브 상태
 * - liveImageUrl: 라이브 이미지 URL
 * - defaultThumbnailImageUrl: 기본 썸네일 이미지 URL
 * - openDate: 오픈 날짜
 * - liveCategory: 라이브 카테고리
 * - channelId: 채널 ID
 * - channelName: 채널 이름
 * - channelImageUrl: 채널 이미지 URL
 * - verifiedMark: 인증 마크 여부
 * - channelType: 채널 유형
 * - channelDescription: 채널 설명
 * - followerCount: 팔로워 수
 * - openLive: 라이브 방송 여부
 * - subscriptionAvailability: 구독 가능 여부 객체
 */
interface ChannelContent {
    liveId: string;
    liveTitle: string;
    status: string;
    liveImageUrl: string | null;
    defaultThumbnailImageUrl: string | null;
    openDate: string;
    liveCategory: string;
    channel: channelInfo;
}

/**
 * 채널 정보 타입 지정
 * - channelId: 채널 ID
 * - channelName: 채널 이름
 * - channelImageUrl: 채널 이미지 URL
 */
interface channelInfo {
    channelId: string;
    channelName: string;
    channelImageUrl: string;
}

/**
 * 치지직 API 응답 타입 지정
 * - code: 응답 코드 (예: 200, 404 등)
 * - message: 응답 메시지 (예: "Success", "Not Found" 등)
 * - content: 채널 정보 객체
 */
interface ApiResponse {
    code: number;
    message: string | null;
    content: ChannelContent;
}

export type {
    ApiResponse,
    ChannelContent,
    channelInfo,
    SubscriptionPaymentAvailability,
};
