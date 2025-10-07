export interface IntervalInfo {
  key: string;
  channelId: string;
  userId: string;
  memberNameRaw: string | null;
}

export interface lastStatus {
  [key: string]: "OPEN" | "CLOSE";
}

export interface MemberState {
  [memberName: string]: {
    intervals: IntervalInfo;
    loadInterval: Map<string, NodeJS.Timeout>;
    lastStatus: [string, "OPEN" | "CLOSE"][];
  };
}

export interface BotState {
  [userId: string]: {
    [memberName: string]: MemberState[string];
  };
}
