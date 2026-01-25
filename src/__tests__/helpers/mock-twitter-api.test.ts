import { describe, it, expect, beforeEach } from "vitest";
import { createMockTwitterApiModule, resetMockTwitterState } from "./mock-twitter-api";

describe("MockTwitterState.listTweets", () => {
  beforeEach(() => {
    resetMockTwitterState();
  });

  it("orders deterministically when created_at timestamps match", () => {
    const { TwitterApi } = createMockTwitterApiModule();
    const api = new TwitterApi();
    const state = (api as any).v2.state;

    const first = state.createTweet("first");
    const second = state.createTweet("second");
    const sameTimestamp = "2020-01-01T00:00:00.000Z";

    first.created_at = sameTimestamp;
    second.created_at = sameTimestamp;

    const list = state.listTweets();
    expect(list.map((tweet: any) => tweet.id)).toEqual([first.id, second.id]);
  });
});
