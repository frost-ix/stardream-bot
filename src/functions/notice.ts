import notices from '../data/notices.json' with { type: 'json' };

function replaceAnouncement(content: string): string {
	const noticesData = notices.notices;
	let announcement = noticesData.find((n) => n.id === "init")!.title;
	announcement += noticesData.find((n) => n.id === "init")!.content;
	if (content === "!공지 재시작") {
        announcement += noticesData.find((n) => n.id === "restart")!.content;
        console.log("📢 관리자 공지 완료");
    } else if (content === "!공지 서버공지") {
        announcement += noticesData.find((n) => n.id === "notice")!.content;
        console.log("📢 관리자 공지 완료");
    } else if (content.startsWith("!공지 ")) {
        announcement += content.slice(4).trim();
    }
	return announcement;
}

export { replaceAnouncement };
