import {
  CategoryChannel,
  ChannelType,
  Guild,
  GuildBasedChannel,
} from "discord.js";

// 환영메시지 보낼 채널 탐색하기
function findWelcomeChannel(guild: Guild): GuildBasedChannel | undefined {
  // 일반 또는 General 채널 탐색
  const generalChannel = guild.channels.cache.find(
    (channel) =>
      (channel.name === "공지사항" || channel.name === "general") &&
      channel.type === ChannelType.GuildText
  );
  if (generalChannel) {
    return generalChannel;
  } else {
    // 최상단 채널 탐색
    return guild.channels.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildText &&
        channel.permissionsFor(guild.members.me!).has("SendMessages")
    );
  }
}

function findChannel(
  guild: Guild,
  channelName: string,
  channelType: ChannelType
): GuildBasedChannel | undefined {
  return guild.channels.cache.find(
    (channel) => channel.name === channelName && channel.type === channelType
  );
}

async function createTextChannel(guild: Guild) {
  const categoryAlarm = await guild.channels.create({
    name: "뱅온-알리미",
    type: ChannelType.GuildCategory,
    reason: "뱅온-알리미 카테고리 생성",
  });

  await Promise.all([
    guild.channels.create({
      name: "공지사항",
      type: ChannelType.GuildText,
      reason: "공지사항 채널 생성",
    }),
    guild.channels.create({
      name: "사용방법",
      type: ChannelType.GuildText,
      reason: "사용방법 채널 생성",
    }),
    guild.channels.create({
      name: "링크",
      type: ChannelType.GuildText,
      reason: "링크 채널 생성",
    }),
    guild.channels.create({
      name: "뱅온-알리미-단체",
      type: ChannelType.GuildText,
      reason: "뱅온-알리미-단체 채널 생성",
      parent: categoryAlarm.id,
    }),
    guild.channels.create({
      name: "뱅온-알리미-개인",
      type: ChannelType.GuildText,
      reason: "뱅온-알리미-개인 채널 생성",
      parent: categoryAlarm.id,
    }),
  ]);

  const generalChannel = findChannel(guild, "일반", ChannelType.GuildText);
  const generalChannelVoice = findChannel(
    guild,
    "일반",
    ChannelType.GuildVoice
  );
  const generalChannelTextCategory = findChannel(
    guild,
    "채팅 채널",
    ChannelType.GuildCategory
  );
  const generalChannelVoiceCategory = findChannel(
    guild,
    "음성 채널",
    ChannelType.GuildCategory
  );

  if (
    generalChannel &&
    generalChannelVoice &&
    generalChannelTextCategory &&
    generalChannelVoiceCategory
  ) {
    await generalChannel.delete();
    await generalChannelVoice.delete();
    await generalChannelTextCategory.delete();
    await generalChannelVoiceCategory.delete();
  }
}

export { findWelcomeChannel, createTextChannel };
