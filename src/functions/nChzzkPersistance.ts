// filepath: src/functions/persistence.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CustomClient } from "../types/customClient.js";
import { TextChannel } from "discord.js";
import { StreamerKey, runCheck } from "./nChzzkFunction.js";
import { BotState, IntervalInfo, intervalRaw } from "../types/intervalInfo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const persistencePath = path.join(
  __dirname,
  "..",
  process.env.PRST_PATH as string,
  process.env.PRST_NAME as string
);

export function saveState(
  client: CustomClient,
  userId: string,
  memberName: string,
  flag: string
) {
  try {
    let existingState: BotState = {};

    if (fs.existsSync(persistencePath)) {
      const fileContent = fs.readFileSync(persistencePath, "utf-8");
      if (fileContent) {
        existingState = JSON.parse(fileContent);
      }
    }

    const clientStateForUser = client.activeIntervalsInfo.get(userId)!;
    const lastStatus = client.backgroundLastStatus;
    const lastStatusRaw = client.backgroundLastStatusRaw;
    const intervalRaw = clientStateForUser[userId].intervals.raw;

    if (client.activeIntervalsInfo.size === 0) {
      console.log("No active intervals to save.");
      return;
    }

    if (flag === "delete") {
      if (existingState[userId] && existingState[userId].lastStatus) {
        delete existingState[userId].lastStatus[memberName];
        existingState[userId].intervals.raw = existingState[
          userId
        ].intervals.raw.filter((r) => r.memberNameRaw !== memberName);
      }
      if (JSON.stringify(existingState[userId].lastStatus) === "{}") {
        delete existingState[userId];
      }
      fs.writeFileSync(persistencePath, JSON.stringify(existingState, null, 2));
      console.log("✅ Bot state saved after deletion.");
      return;
    }
    if (flag === "add") {
      if (clientStateForUser) {
        if (!existingState[userId]) {
          existingState[userId] = {
            intervals: {
              userId: clientStateForUser[userId].intervals.userId,
              userTag: clientStateForUser[userId].intervals.userTag,
              raw: [],
            },
            lastStatus: {},
          };
        }
        if (memberName === "ALL") {
          existingState[userId].intervals.raw.push(...intervalRaw);
          existingState[userId].lastStatus[memberName] = lastStatus
            ? Object.fromEntries(lastStatus)
            : {};
        } else {
          const internalRawFind = intervalRaw.find(
            (r) => r.memberNameRaw === memberName
          );

          if (!internalRawFind) return;
          existingState[userId].intervals.raw.push({ ...internalRawFind });
          existingState[userId].lastStatus[memberName] = lastStatusRaw
            ? Object.fromEntries(
                Array.from(lastStatusRaw.entries()).filter((entry) =>
                  entry[0].startsWith(internalRawFind.key)
                )
              )
            : {};
        }
      }
    }

    fs.writeFileSync(persistencePath, JSON.stringify(existingState, null, 2));
    console.log("✅ Bot state saved.");
  } catch (error) {
    console.error("Error saving bot state:", error);
  }
}

// Client가 준비 됐을 때 실행
export function loadState(client: CustomClient) {
  try {
    if (fs.existsSync(persistencePath)) {
      const fileContent = fs.readFileSync(persistencePath, "utf-8");
      if (!fileContent) {
        console.log("Bot state file is empty.");
        return;
      }

      const state: BotState = JSON.parse(fileContent);

      // 각 사용자 별 등록 된 Interval Data를 복원
      for (const userId in state) {
        const userState = state[userId];
        const intervalInfo = userState.intervals;
        const lastStatusObj = userState.lastStatus;

        const restoreBotState: BotState = {
          [userId]: {
            intervals: intervalInfo,
            lastStatus: lastStatusObj,
          },
        };

        // Interval 정보 복원
        if (intervalInfo) {
          client.activeIntervalsInfo.set(userId, restoreBotState);
        }

        // 마지막 상태 복원
        if (lastStatusObj) {
          for (const memberName in lastStatusObj) {
            const statusData = lastStatusObj[memberName];
            if (memberName === "ALL") {
              for (const [key, value] of Object.entries(statusData)) {
                client.backgroundLastStatus.set(key, value as "OPEN" | "CLOSE");
              }
            } else {
              for (const [key, value] of Object.entries(statusData)) {
                client.backgroundLastStatusRaw.set(
                  key,
                  value as "OPEN" | "CLOSE"
                );
              }
            }
          }
        }

        // Interval 재시작
        for (const raw of intervalInfo.raw) {
          restartInterval(client, intervalInfo, raw);
        }
      }

      console.log("✅ Bot state loaded and all intervals restarted.");
    }
  } catch (error) {
    console.error("Error loading bot state:", error);
  }
}

async function restartInterval(
  client: CustomClient,
  info: IntervalInfo,
  raw: intervalRaw
) {
  const { userId, userTag } = info;
  const memberName: StreamerKey | "ALL" = raw.memberNameRaw;
  const channelId = raw.key.split("_")[0];
  const key = raw.key;

  if (!info) return;
  if (client.backgroundIntervals.has(key)) {
    // 재시작 됐을 때 Node 안에 남아있는 Interval이 있으면 제거
    if (client.backgroundIntervals.get(key)) {
      clearInterval(client.backgroundIntervals.get(key)!);
    } else return;
  }

  await runCheck(
    key,
    memberName,
    client.channels.cache.get(channelId) as TextChannel,
    { userId, userTag },
    client,
    memberName
  );

  const intervalId = setInterval(() => {
    runCheck(
      key,
      memberName,
      client.channels.cache.get(channelId) as TextChannel,
      { userId, userTag },
      client,
      memberName
    );
  }, 3 * 60 * 1000); // 3분마다 실행
  client.backgroundIntervals.set(key, intervalId);
}
