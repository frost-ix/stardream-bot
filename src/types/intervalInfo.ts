import { StreamerKey } from "../functions/nChzzkFunction.js";

export interface IntervalInfo {
  userId: string;
  userTag: string;
  raw: {
    memberNameRaw: StreamerKey | "ALL";
    key: string;
    raw: string;
  }[];
}

export interface intervalRaw {
  memberNameRaw: StreamerKey | "ALL";
  key: string;
  raw: string;
}

export interface lastStatus {
  [key: string]: {
    [key: string]: "OPEN" | "CLOSE";
  };
}

export interface BotState {
  [userId: string]: {
    intervals: IntervalInfo;
    lastStatus: lastStatus;
  };
}
