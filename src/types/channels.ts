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
    channelId: string;
    channelName: string;
    channelImageUrl: string;
    verifiedMark: boolean;
    channelType: string;
    channelDescription: string;
    followerCount: number;
    openLive: boolean;
    subscriptionAvailability: boolean;
    subscriptionPaymentAvailability: SubscriptionPaymentAvailability;
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

export type { ApiResponse, ChannelContent, SubscriptionPaymentAvailability };
