type MockTweet = {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  conversation_id: string;
  referenced_tweets?: Array<{ type: "replied_to" | "retweeted" | "quoted"; id: string }>;
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
    impression_count: number;
  };
  entities?: {
    hashtags?: Array<{ tag: string }>;
    mentions?: Array<{ id: string; username: string }>;
    urls?: Array<{ url: string }>;
  };
};

type MockUser = {
  id: string;
  username: string;
  name: string;
  description?: string;
  profile_image_url?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
  };
  verified?: boolean;
  location?: string;
  created_at?: string;
};

type MockIncludes = {
  users?: MockUser[];
};

class MockTwitterState {
  private static instance: MockTwitterState | null = null;

  static get(): MockTwitterState {
    if (!MockTwitterState.instance) {
      MockTwitterState.instance = new MockTwitterState();
    }
    return MockTwitterState.instance;
  }

  private counter = 1;
  readonly user: MockUser = {
    id: "user-1",
    username: "testuser",
    name: "Test User",
    description: "Mock user",
    profile_image_url: "https://example.com/avatar.png",
    public_metrics: { followers_count: 10, following_count: 5 },
    verified: false,
    location: "Test City",
    created_at: new Date("2020-01-01T00:00:00.000Z").toISOString(),
  };
  private tweets = new Map<string, MockTweet>();

  reset() {
    this.counter = 1;
    this.tweets.clear();
  }

  createTweet(text: string, replyToId?: string): MockTweet {
    const id = String(this.counter++);
    const created_at = new Date().toISOString();
    const referenced_tweets = replyToId
      ? [{ type: "replied_to" as const, id: replyToId }]
      : undefined;
    const conversation_id = replyToId ?? id;

    const tweet: MockTweet = {
      id,
      text,
      created_at,
      author_id: this.user.id,
      conversation_id,
      referenced_tweets,
      public_metrics: {
        like_count: 0,
        retweet_count: 0,
        reply_count: 0,
        quote_count: 0,
        impression_count: 0,
      },
      entities: {
        hashtags: [],
        mentions: [],
        urls: [],
      },
    };

    this.tweets.set(id, tweet);
    return tweet;
  }

  deleteTweet(id: string): boolean {
    return this.tweets.delete(id);
  }

  getTweet(id: string): MockTweet | undefined {
    return this.tweets.get(id);
  }

  listTweets(): MockTweet[] {
    return Array.from(this.tweets.values()).sort((a, b) =>
      a.created_at < b.created_at ? 1 : -1,
    );
  }

  listTweetsByUser(userId: string): MockTweet[] {
    return this.listTweets().filter((tweet) => tweet.author_id === userId);
  }

  searchTweets(query: string): MockTweet[] {
    const normalized = query.toLowerCase();
    if (!normalized.trim()) {
      return this.listTweets();
    }
    return this.listTweets().filter((tweet) =>
      tweet.text.toLowerCase().includes(normalized),
    );
  }

  likeTweet(id: string): void {
    const tweet = this.tweets.get(id);
    if (tweet) {
      tweet.public_metrics.like_count += 1;
    }
  }
}

class MockPaginator implements AsyncIterable<MockTweet> {
  constructor(
    private readonly tweets: MockTweet[],
    public readonly includes: MockIncludes,
  ) {}

  async *[Symbol.asyncIterator](): AsyncIterator<MockTweet> {
    for (const tweet of this.tweets) {
      yield tweet;
    }
  }
}

class MockV2 {
  constructor(private readonly state: MockTwitterState) {}

  async me() {
    return { data: this.state.user };
  }

  async tweet(config: { text: string; reply?: { in_reply_to_tweet_id?: string } }) {
    const replyToId = config.reply?.in_reply_to_tweet_id;
    const tweet = this.state.createTweet(config.text, replyToId);
    return { data: { id: tweet.id, text: tweet.text } };
  }

  async deleteTweet(id: string) {
    const deleted = this.state.deleteTweet(id);
    return { data: { deleted } };
  }

  async singleTweet(id: string) {
    const tweet = this.state.getTweet(id);
    return {
      data: tweet ?? null,
      includes: { users: [this.state.user] },
    };
  }

  async userTimeline(userId: string) {
    const tweets = this.state.listTweetsByUser(userId);
    return new MockPaginator(tweets, { users: [this.state.user] });
  }

  async homeTimeline() {
    const tweets = this.state.listTweets();
    return new MockPaginator(tweets, { users: [this.state.user] });
  }

  async search(query: string) {
    const tweets = this.state.searchTweets(query);
    return new MockPaginator(tweets, { users: [this.state.user] });
  }

  async like(userId: string, tweetId: string) {
    this.state.likeTweet(tweetId);
    return { data: { liked: true } };
  }

  async userByUsername(username: string) {
    if (username === this.state.user.username) {
      return { data: this.state.user };
    }
    return { data: null };
  }

  async user(userId: string) {
    if (userId === this.state.user.id) {
      return { data: this.state.user };
    }
    return { data: null };
  }
}

class MockTwitterApi {
  v2: MockV2;
  constructor() {
    this.v2 = new MockV2(MockTwitterState.get());
  }
}

export function createMockTwitterApiModule() {
  return { TwitterApi: MockTwitterApi };
}

export function resetMockTwitterState() {
  MockTwitterState.get().reset();
}
