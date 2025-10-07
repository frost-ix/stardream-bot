// filepath: src/functions/persistence.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CustomClient } from '../types/customClient.js';
import { TextChannel } from 'discord.js';
import { checkChannelStatus, convertName, setEmbedBuilder, StreamerKey } from './nChzzkFunction.js';
import streamers from '../data/streamers.json' with { type: 'json' };
import { BotState, IntervalInfo } from '../types/intervalInfo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const persistencePath = path.join(__dirname, '..', process.env.PRST_PATH as string, process.env.PRST_NAME as string);

export function saveState(client: CustomClient, userId: string, memberName: string) {
    try {
        let existingState: BotState = {};
        
        if (fs.existsSync(persistencePath)) {
            const fileContent = fs.readFileSync(persistencePath, 'utf-8');
            
            if (fileContent) {
                existingState = JSON.parse(fileContent);
            }
        }

        const clientStateForUser = client.activeIntervalsInfo.get(userId)?.[userId];
        
        if (!clientStateForUser) {
            console.log('No state to save for userId:', userId);
            return;
        }

        const memberState = clientStateForUser[memberName];

        if (!existingState[userId]) {
            existingState[userId] = {};
        }

        if (memberState && Object.keys(memberState.intervals).length === 0) {
            delete existingState[userId][memberName];
            if (Object.keys(existingState[userId]).length === 0) {
                delete existingState[userId];
            }
        } else {
            existingState[userId][memberName] = memberState;
        }

        fs.writeFileSync(persistencePath, JSON.stringify(existingState, null, 2));
        console.log('✅ Bot state saved.');
    } catch (error) {
        console.error('Error saving bot state:', error);
    }
}

// Client가 준비 됐을 때 실행
export function loadState(client: CustomClient) {
    try {
        if (fs.existsSync(persistencePath)) {
            const fileContent = fs.readFileSync(persistencePath, 'utf-8');
            if (!fileContent) {
                console.log('Bot state file is empty.');
                return;
            }

            const state: BotState = JSON.parse(fileContent);
            console.log('Loaded state from file:', state);

            // 각 사용자 별 등록 된 Interval Data를 복원
            for (const userId in state) {
                if (Object.prototype.hasOwnProperty.call(state, userId)) {
                    const userState = state[userId];
                    for (const memberName in userState) {
                        if (Object.prototype.hasOwnProperty.call(userState, memberName)) {
                            const memberState = userState[memberName];
                            if (memberState && memberState.intervals && memberState.intervals.key) {
                                memberState.lastStatus.forEach(([key, status]) => {
                                    client.backgroundLastStatus.set(key, status);
                                });
                                
                                if (!client.activeIntervalsInfo.has(userId)) {
                                    client.activeIntervalsInfo.set(userId, {});
                                }
                                const clientUserState = client.activeIntervalsInfo.get(userId) ? client.activeIntervalsInfo.get(userId) : undefined;
                                if (clientUserState) {
                                    clientUserState[userId] = {
                                        ...clientUserState[userId],
                                        [memberName]: memberState
                                    };
                                    client.activeIntervalsInfo.set(userId, clientUserState);
                                }
                                console.log(`Restarting interval for userId: ${userId}, memberName: ${memberName}, intervalInfo:`, memberState.intervals);

                                restartInterval(client, memberState.intervals);
                            }
                        }
                    }
                }
            }

            console.log('✅ Bot state loaded and all intervals restarted.');
        }
    } catch (error) {
        console.error('Error loading bot state:', error);
    }
}

function restartInterval(client: CustomClient, info: IntervalInfo) {
    if (!info) return;
    if (client.backgroundIntervals.has(info.key)) {
        console.log(`Interval for key ${info.key} is already running.`);
        return;
    }
    const { key, channelId, userId, memberNameRaw } = info;
    const memberName: StreamerKey | "ALL" = memberNameRaw ? convertName(memberNameRaw) as StreamerKey : "ALL";

    const runCheck = async () => {
        const channel = await client.channels.fetch(channelId) as TextChannel;
        if (!channel) {
            console.error(`Could not find channel ${channelId} to restart interval.`);
            clearInterval(client.backgroundIntervals.get(key));
            client.backgroundIntervals.delete(key);
            client.activeIntervalsInfo.delete(key);
            return;
        }

        try {
            if (memberName !== "ALL") { // 단일 멤버
                const streamerInfo = streamers.stardream[memberName];
                if (!streamerInfo) return;
                const liveStatus = await checkChannelStatus(streamerInfo.id);
                const prev = client.backgroundLastStatus.get(key);
                if (prev !== liveStatus) {
                    client.backgroundLastStatus.set(key, liveStatus);
                    if (liveStatus === 'OPEN') {
                        const embedLive = await setEmbedBuilder(streamerInfo.id, streamerInfo.name);
                        channel.send({ content: `🔔 <@${userId}>님, [${streamerInfo.name}]님의 방송이 시작되었습니다!`, embeds: [embedLive] });
                    } else {
                        channel.send(`🌙 ${streamerInfo.name}님이 방송을 종료했습니다.`);
                    }
                }
            } else { // 전체 멤버
                for (const memberKey in streamers.stardream) {
                    const { id, name } = streamers.stardream[memberKey as StreamerKey];
                    const memberKeyFull = key + memberKey;
                    const liveStatus = await checkChannelStatus(id);
                    const prev = client.backgroundLastStatus.get(memberKeyFull);
                    if (prev !== liveStatus) {
                        client.backgroundLastStatus.set(memberKeyFull, liveStatus);
                        if (liveStatus === 'OPEN') {
                            const embedLive = await setEmbedBuilder(id, name);
                            channel.send({ content: `🔔 <@${userId}>님, [${name}]님의 방송이 시작되었습니다!`, embeds: [embedLive] });
                        } else {
                            channel.send(`🌙 ${name}님이 방송을 종료했습니다.`);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error during restarted check for key ${key}:`, error);
        }
    };

    runCheck();
    const intervalId = setInterval(runCheck, 3 * 60 * 1000);
    client.backgroundIntervals.set(key, intervalId);
}