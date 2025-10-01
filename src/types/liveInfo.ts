/**
 * 치지직 라이브 정보 타입 정의
 */

/**
 * 치지직 API 응답 타입 지정
 * - code: 응답 코드 (예: 200, 404 등)
 * - message: 응답 메시지 (예: "Success", "Not Found" 등)
 * - content: 라이브 정보 객체
 */
interface LiveResponse {
    code: number;
    message: string | null;
    content: LiveContent;
}

/**
 * 라이브 정보 타입 지정
 * - liveTitle: 라이브 제목
 * - openDate: 라이브 시작 날짜
 * - liveCategory: 라이브 카테고리
 */
interface LiveContent {
    liveTitle: string;
    openDate: string;
    liveCategory: string;
}

export type { LiveResponse, LiveContent };
