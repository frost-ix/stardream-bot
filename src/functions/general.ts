import { ChannelType, Guild, GuildBasedChannel } from 'discord.js';

// 환영메시지 보낼 채널 탐색하기
function findWelcomeChannel(guild: Guild): GuildBasedChannel | undefined {
    // 시스템 채널 탐색
    if (guild.systemChannel) {
        return guild.systemChannel;
    }

    // 일반 또는 General 채널 탐색
    const generalChannel = guild.channels.cache.find(
        (channel) =>
            (channel.name === '일반' || channel.name === 'general') &&
            channel.type === ChannelType.GuildText
    );
    if (generalChannel) {
        return generalChannel;
    }

    // 최상단 채널 탐색
    return guild.channels.cache.find(
        (channel) =>
            channel.type === ChannelType.GuildText &&
            channel.permissionsFor(guild.members.me!).has('SendMessages')
    );
}

export { findWelcomeChannel };
