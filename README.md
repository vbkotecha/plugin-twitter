# Eliza Twitter/X Client

This package provides Twitter/X integration for the Eliza AI agent using the official Twitter API v2.

## 🚨 TL;DR - Quick Setup

**Just want your bot to post tweets? Here's the fastest path:**

1. **If you have enterprise/broker access (recommended)**: get a broker URL + API key
2. **Otherwise BYO developer account**: https://developer.twitter.com (create an app and enable "Read and write")
3. Choose your auth mode:

   - **Option A (broker, enterprise): token broker service**
     - Broker URL (from your broker deployment)
     - Broker API Key (agent key issued by the broker)

   - **Option B (developer account, recommended): “login + approve” OAuth 2.0 (PKCE)**
     - Client ID (from "OAuth 2.0 Client ID")
     - Redirect URI (loopback recommended)

   - **Option C (developer account, legacy): OAuth 1.0a env vars**
     - API Key & Secret (from "Consumer Keys")
     - Access Token & Secret (from "Authentication Tokens")

4. **Add to `.env`:**
   ```bash
  # Option A: Broker (recommended for enterprise/shared access)
  TWITTER_AUTH_MODE=broker
  TWITTER_BROKER_URL=https://broker.example.com
  TWITTER_BROKER_API_KEY=xxx

  # Option B: OAuth 2.0 PKCE (developer account, interactive login + approve)
   # TWITTER_AUTH_MODE=oauth
   # TWITTER_CLIENT_ID=xxx
   # TWITTER_REDIRECT_URI=http://127.0.0.1:8080/callback

  # Option C: legacy OAuth 1.0a (developer account, default if TWITTER_AUTH_MODE unset)
  # TWITTER_AUTH_MODE=env
  # TWITTER_API_KEY=xxx
  # TWITTER_API_SECRET_KEY=xxx
  # TWITTER_ACCESS_TOKEN=xxx
  # TWITTER_ACCESS_TOKEN_SECRET=xxx

   TWITTER_ENABLE_POST=true
   TWITTER_POST_IMMEDIATELY=true
   ```
5. **Run:** `bun start`

Tip: if you use **OAuth 2.0 PKCE**, the plugin will print an authorization URL on first run and store tokens for you (no manual token pasting).

## Features

- ✅ **Autonomous tweet posting** with configurable intervals
- ✅ **Timeline monitoring** and interaction
- ✅ **Mention and reply handling**
- ✅ **Search functionality**
- ✅ **Direct message support**
- ✅ **Advanced timeline algorithms** with weighted scoring
- ✅ **Comprehensive caching system**
- ✅ **Built-in rate limiting and retry mechanisms**
- ✅ **Discovery service** for autonomous content discovery and growth

## Prerequisites

- **Enterprise/broker credentials (recommended)** or a **Twitter Developer Account** with API v2 access
- Either broker credentials, OAuth 2.0 Client ID (PKCE), or OAuth 1.0a credentials (legacy)
- Node.js and bun installed

## 🚀 Quick Start

### Step 1: Get Twitter Access (Broker Recommended)

Choose one path:

**A) Enterprise / broker (recommended)**
- If Eliza (or your org) provides enterprise Twitter access, request:
  - `TWITTER_BROKER_URL`
  - `TWITTER_BROKER_API_KEY`
- No Twitter developer account is required for broker mode.

**B) BYO Developer Account**
1. Apply for a developer account at https://developer.twitter.com
2. Create a new app in the [Developer Portal](https://developer.twitter.com/en/portal/projects-and-apps)
3. Ensure your app has API v2 access

### Step 2: Configure App Permissions for Posting (Developer Account Only)

**⚠️ CRITICAL: Default apps can only READ. You must enable WRITE permissions to post tweets!**

1. In your app settings, go to **"User authentication settings"**
2. Configure exactly as shown:

   **App permissions**: `Read and write` ✅
   
   **Type of App**: `Web App, Automated App or Bot`
   
   **Required URLs** (copy these exactly):
   ```
   Callback URI: http://localhost:3000/callback
   Website URL: https://github.com/elizaos/eliza
   ```
   
   **Optional fields**:
   ```
   Organization name: ElizaOS
   Organization URL: https://github.com/elizaos/eliza
   ```

3. Click **Save**

### Step 3: Get the RIGHT Credentials (Developer Account Only)

You can use either legacy **OAuth 1.0a** env vars (default) or **OAuth 2.0 PKCE** (“login + approve”).
If you're using broker mode, skip this section.

In your app's **"Keys and tokens"** page, you'll see several sections. Here's what to use:

```
✅ USE THESE when TWITTER_AUTH_MODE=env (OAuth 1.0a):
┌─────────────────────────────────────────────────┐
│ Consumer Keys                                   │
│ ├─ API Key: xxx...xxx          → TWITTER_API_KEY │
│ └─ API Key Secret: xxx...xxx   → TWITTER_API_SECRET_KEY │
│                                                 │
│ Authentication Tokens                           │
│ ├─ Access Token: xxx...xxx     → TWITTER_ACCESS_TOKEN │
│ └─ Access Token Secret: xxx    → TWITTER_ACCESS_TOKEN_SECRET │
└─────────────────────────────────────────────────┘

✅ USE THESE when TWITTER_AUTH_MODE=oauth (OAuth 2.0 PKCE):
┌─────────────────────────────────────────────────┐
│ OAuth 2.0 Client ID and Client Secret          │
│ ├─ Client ID: xxx...xxx        → TWITTER_CLIENT_ID │
│ └─ Client Secret: xxx...xxx    ← NOT USED (do not put in env) │
│                                                 │
│ Bearer Token                   ← NOT USED      │
└─────────────────────────────────────────────────┘
```

**After enabling write permissions, you MUST:**
1. Click **"Regenerate"** on Access Token & Secret
2. Copy the NEW tokens (old ones won't have write access)
3. Look for "Created with Read and Write permissions" ✅

### Step 4: Configure Environment Variables

Create or edit `.env` file in your project root:

```bash
# Auth mode (default in code: env; recommended for enterprise: broker)
# - broker: token broker service (short-lived OAuth2 access tokens)
# - oauth: “login + approve” OAuth 2.0 PKCE (no client secret in plugin)
# - env: legacy OAuth 1.0a keys/tokens

# ---- Recommended (Enterprise/Broker) ----
TWITTER_AUTH_MODE=broker
TWITTER_BROKER_URL=https://broker.example.com
TWITTER_BROKER_API_KEY=your_agent_api_key

# ---- OR (Developer Account) ----
# OAuth 2.0 PKCE (“login + approve”) configuration:
# TWITTER_AUTH_MODE=oauth
# TWITTER_CLIENT_ID=your_oauth2_client_id_here
# TWITTER_REDIRECT_URI=http://127.0.0.1:8080/callback
# Optional:
# TWITTER_SCOPES="tweet.read tweet.write users.read offline.access"

# ---- OR (Developer Account, Legacy OAuth 1.0a) ----
# TWITTER_AUTH_MODE=env
# TWITTER_API_KEY=your_api_key_here                    # From "API Key"
# TWITTER_API_SECRET_KEY=your_api_key_secret_here      # From "API Key Secret"
# TWITTER_ACCESS_TOKEN=your_access_token_here          # Must have "Read and Write"
# TWITTER_ACCESS_TOKEN_SECRET=your_token_secret_here   # Regenerate after permission change

# Basic Configuration
TWITTER_DRY_RUN=false              # Set to true to test without posting
TWITTER_ENABLE_POST=true           # Enable autonomous tweet posting

# Optional: Posting Configuration
TWITTER_POST_IMMEDIATELY=true      # Post on startup (great for testing)
TWITTER_POST_INTERVAL=120          # Minutes between posts (default: 120)
# For more natural timing, use MIN/MAX intervals:
TWITTER_POST_INTERVAL_MIN=90       # Minimum minutes between posts  
TWITTER_POST_INTERVAL_MAX=150      # Maximum minutes between posts
```

When using **TWITTER_AUTH_MODE=oauth**, the plugin will:
- Print an authorization URL on first run
- Capture the callback via a local loopback server **or** ask you to paste the redirected URL
- Persist tokens via Eliza runtime cache if available, otherwise a local token file at `~/.eliza/twitter/oauth2.tokens.json`

When using **TWITTER_AUTH_MODE=broker**, the plugin will:
- Call `GET {TWITTER_BROKER_URL}/v1/twitter/access-token`
- Send `Authorization: Bearer {TWITTER_BROKER_API_KEY}`
- Use the returned short-lived OAuth2 access token for Twitter API v2 calls

### Step 5: Run Your Bot

```typescript
// Your character should include the twitter plugin
const character = {
    // ... other config
    plugins: [
        "@elizaos/plugin-bootstrap",  // Required for content generation
        "@elizaos/plugin-twitter"      // Twitter functionality
    ],
    postExamples: [                    // Examples for tweet generation
        "Just discovered an amazing pattern in the data...",
        "The future of AI is collaborative intelligence",
        // ... more examples
    ]
};
```

Then start your bot:
```bash
bun run start
```

## 📋 Complete Configuration Reference

```bash
# Required Twitter API v2 Credentials (OAuth 1.0a)
TWITTER_API_KEY=                    # Consumer API Key
TWITTER_API_SECRET_KEY=             # Consumer API Secret
TWITTER_ACCESS_TOKEN=               # Access Token (with write permissions)
TWITTER_ACCESS_TOKEN_SECRET=        # Access Token Secret

# Auth Mode
# - env (default): OAuth 1.0a credentials above
# - oauth: OAuth 2.0 PKCE (client id + redirect uri)
# - broker: token broker service (short-lived OAuth2 access tokens)
TWITTER_AUTH_MODE=env

# OAuth 2.0 PKCE
TWITTER_CLIENT_ID=                  # OAuth 2.0 Client ID (oauth mode)
TWITTER_REDIRECT_URI=               # Redirect URI (oauth mode)
TWITTER_SCOPES=                     # Optional, space-separated scopes

# Broker mode
TWITTER_BROKER_URL=                 # Broker base URL (broker mode)
TWITTER_BROKER_API_KEY=             # Broker agent API key (broker mode)

# Core Configuration
TWITTER_DRY_RUN=false              # Set to true for testing without posting
TWITTER_TARGET_USERS=              # Comma-separated usernames to target (use "*" for all)
TWITTER_RETRY_LIMIT=5              # Maximum retry attempts for failed operations

# Feature Toggles
TWITTER_ENABLE_POST=false          # Enable autonomous tweet posting
TWITTER_ENABLE_REPLIES=true        # Enable mention and reply handling
TWITTER_ENABLE_ACTIONS=false       # Enable timeline actions (likes, retweets, quotes)
TWITTER_ENABLE_DISCOVERY=          # Enable discovery service (defaults to true if ACTIONS enabled)

# Timing Configuration (all in minutes)
# For natural behavior, set MIN/MAX intervals - the agent will randomly choose between them
# If MIN/MAX not set, falls back to the fixed interval values

# Post intervals
TWITTER_POST_INTERVAL=120          # Fixed interval between posts (default: 120, used if MIN/MAX not set)
TWITTER_POST_INTERVAL_MIN=90       # Minimum minutes between posts (default: 90)
TWITTER_POST_INTERVAL_MAX=150      # Maximum minutes between posts (default: 150)

# Engagement intervals  
TWITTER_ENGAGEMENT_INTERVAL=30     # Fixed interval for interactions (default: 30, used if MIN/MAX not set)
TWITTER_ENGAGEMENT_INTERVAL_MIN=20 # Minimum minutes between engagements (default: 20)
TWITTER_ENGAGEMENT_INTERVAL_MAX=40 # Maximum minutes between engagements (default: 40)

# Discovery intervals
TWITTER_DISCOVERY_INTERVAL_MIN=15  # Minimum minutes between discovery cycles (default: 15)
TWITTER_DISCOVERY_INTERVAL_MAX=30  # Maximum minutes between discovery cycles (default: 30)

# Engagement Limits
TWITTER_MAX_ENGAGEMENTS_PER_RUN=5  # Maximum interactions per engagement cycle (default: 5)
TWITTER_MAX_TWEET_LENGTH=280       # Maximum tweet length

# Discovery Service Settings
TWITTER_MIN_FOLLOWER_COUNT=100     # Minimum followers for accounts to follow
TWITTER_MAX_FOLLOWS_PER_CYCLE=5    # Maximum accounts to follow per discovery cycle
```

## 🔍 Discovery Service

The Twitter Discovery Service enables autonomous content discovery and engagement, helping your agent build a following and interact with relevant content on Twitter.

### Overview

The discovery service autonomously:
- Searches for content related to your agent's topics
- Identifies high-quality accounts to follow
- Engages with relevant tweets through likes, replies, and quotes
- Builds up your agent's timeline by following interesting accounts

### Configuration

```bash
# Enable discovery service (defaults to true if TWITTER_ENABLE_ACTIONS=true)
TWITTER_ENABLE_DISCOVERY=true

# Discovery interval in minutes (default: 30)
TWITTER_DISCOVERY_INTERVAL=30

# Minimum follower count for accounts to follow (default: 100)
TWITTER_MIN_FOLLOWER_COUNT=100

# Maximum accounts to follow per cycle (default: 5)
TWITTER_MAX_FOLLOWS_PER_CYCLE=5

# Maximum engagements per cycle (default: 10)
TWITTER_MAX_ENGAGEMENTS_PER_RUN=10
```

### How It Works

1. **Content Discovery**: Searches for tweets containing your agent's topics
2. **Account Scoring**: Scores accounts based on quality (follower count) and relevance
3. **Tweet Scoring**: Scores tweets for engagement based on relevance:
   - Like: score > 0.6
   - Reply: score > 0.8
   - Quote: score > 0.85
4. **Memory System**: Tracks engaged tweets and followed accounts to avoid duplicates

### Character Configuration

The discovery service uses your agent's character configuration:

```json
{
  "name": "YourAgent",
  "topics": [
    "artificial intelligence",
    "machine learning",
    "web3",
    "blockchain"
  ],
  "bio": "AI researcher interested in decentralized systems"
}
```

If topics aren't specified, the service extracts them from the bio.

## 🎯 Common Use Cases

### Just Want to Post Tweets?

```bash
# Minimal setup for posting only
TWITTER_API_KEY=xxx
TWITTER_API_SECRET_KEY=xxx
TWITTER_ACCESS_TOKEN=xxx        # Must have write permissions!
TWITTER_ACCESS_TOKEN_SECRET=xxx

TWITTER_ENABLE_POST=true
TWITTER_POST_IMMEDIATELY=true   # Great for testing
TWITTER_ENABLE_REPLIES=false    # Disable interactions
TWITTER_ENABLE_ACTIONS=false    # Disable timeline actions
```

### Want Full Interaction Bot?

If you're using **broker mode**, just set `TWITTER_AUTH_MODE=broker` with your broker URL/API key and keep the feature toggles below.
The example here shows **developer account** credentials.

```bash
# Full interaction setup
TWITTER_API_KEY=xxx
TWITTER_API_SECRET_KEY=xxx
TWITTER_ACCESS_TOKEN=xxx
TWITTER_ACCESS_TOKEN_SECRET=xxx

TWITTER_ENABLE_POST=true
TWITTER_ENABLE_REPLIES=true
TWITTER_ENABLE_ACTIONS=true      # Enables likes, retweets, quotes
TWITTER_ENABLE_DISCOVERY=true    # Enables growth features
```

### Testing Without Posting?

```bash
# Dry run mode
TWITTER_DRY_RUN=true            # Simulates all actions
TWITTER_ENABLE_POST=true
TWITTER_POST_IMMEDIATELY=true
```

## 🚨 Troubleshooting

### 403 Errors When Engaging with Tweets

If you see errors like "Failed to create tweet: Request failed with code 403", this usually means:

1. **Missing Write Permissions**: Make sure your Twitter app has "Read and write" permissions
   - Go to your app settings in the Twitter Developer Portal (BYO developer account)
   - Check that App permissions shows "Read and write" ✅
   - If not, change it and regenerate your Access Token & Secret
   - **Broker/enterprise**: confirm your broker app has write permissions (or ask your broker admin)

2. **Protected Accounts**: The bot may be trying to engage with protected/private accounts
   - The plugin now automatically skips these with a warning

3. **Self-Engagement**: Trying to reply to or quote your own tweets
   - Twitter API doesn't allow this and returns 403

4. **Account Restrictions**: Your account may have restrictions
   - Check if your account is in good standing
   - Ensure you're not violating Twitter's automation rules

The plugin will now:
- Automatically detect and skip 403 errors with a warning
- Continue processing other tweets
- Mark failed tweets as "skip" to avoid retrying

### Other Common Issues

### "403 Forbidden" When Posting

This is the #1 issue! Your app has read-only permissions.

**Solution:**
1. Go to app settings → "User authentication settings"
2. Change to "Read and write"
3. Save settings
4. **CRITICAL**: Regenerate your Access Token & Secret
5. Update `.env` with NEW tokens
6. Restart your bot

**How to verify:** In "Keys and tokens", your Access Token should show "Created with Read and Write permissions"

### "Could not authenticate you"

This usually means your credentials don’t match your selected auth mode.

**Solution:**
- If `TWITTER_AUTH_MODE=env`:
  - Use credentials from "Consumer Keys" section (API Key/Secret)
  - Use credentials from "Authentication Tokens" section (Access Token/Secret)
  - Do not use OAuth 2.0 Client ID/Client Secret/Bearer Token for this mode
- If `TWITTER_AUTH_MODE=oauth`:
  - Use OAuth 2.0 **Client ID** (`TWITTER_CLIENT_ID`)
  - Set a loopback redirect URI (`TWITTER_REDIRECT_URI`, e.g. `http://127.0.0.1:8080/callback`)
  - Do not set/ship a client secret (PKCE flow)
- If `TWITTER_AUTH_MODE=broker`:
  - Set `TWITTER_BROKER_URL` to your broker base URL
  - Set `TWITTER_BROKER_API_KEY` to the agent API key issued by the broker
  - Verify the broker responds at `/v1/twitter/access-token`

### Bot Not Posting Automatically

**Checklist:**
- ✅ Is `TWITTER_ENABLE_POST=true`?
- ✅ Is `@elizaos/plugin-bootstrap` installed?
- ✅ Does your character have `postExamples`?
- ✅ Check logs for "Twitter posting is ENABLED"
- ✅ Try `TWITTER_POST_IMMEDIATELY=true` for testing

### Timeline Not Loading

**Common causes:**
- Rate limiting (check broker logs or Twitter Developer Portal if BYO)
- Invalid credentials
- Account restrictions

### "Invalid or expired token"

Your tokens may have been revoked or regenerated.

**Solution:**
1. If **broker mode**: rotate/reissue the broker API key (or ask your broker admin)
2. If **developer account**: go to Twitter Developer Portal and regenerate tokens
3. Update `.env`
4. Restart bot

## 📚 Advanced Features

### Timeline Processing

The plugin supports two main approaches:
- **Timeline Actions**: Process home timeline for likes, retweets, and quotes
- **Targeted Interactions**: Reply to mentions and specific users

### Target User Configuration

```bash
# Interact with everyone (default)
TWITTER_TARGET_USERS=

# Interact with specific users only
TWITTER_TARGET_USERS=user1,user2,user3

# Interact with everyone (explicit)
TWITTER_TARGET_USERS=*
```

### Natural Posting Intervals

The plugin adds variance to all intervals for more human-like behavior:
- Post intervals vary by ±20% by default
- Discovery intervals vary by ±10 minutes
- Engagement intervals vary based on activity

### Request Queue & Rate Limiting

The plugin includes sophisticated rate limiting:
- Automatic retry with exponential backoff
- Request queue to prevent API abuse
- Configurable retry limits
- Built-in caching to reduce API calls

## 🧪 Development & Testing

```bash
# Run tests
bun test

# Run with debug logging  
DEBUG=eliza:* bun start

# Test without posting
TWITTER_DRY_RUN=true bun start
```

### Mock broker (local dev)

If you want to test broker mode without a real broker, you can run a local mock broker:

```bash
bun run mock:broker
```

Then set:

```bash
TWITTER_AUTH_MODE=broker
TWITTER_BROKER_URL=http://127.0.0.1:8787
TWITTER_BROKER_API_KEY=dev-key
```

### Testing Checklist

1. **Test Auth**: Check logs for successful Twitter login
2. **Test Posting**: Set `TWITTER_POST_IMMEDIATELY=true`
3. **Test Dry Run**: Use `TWITTER_DRY_RUN=true` first
4. **Monitor Logs**: Look for "Twitter posting is ENABLED"

## 🔒 Security Best Practices

- Store credentials in `.env` file (never commit!)
- Use `.env.local` for local development
- Regularly rotate API keys
- Monitor API usage (Developer Portal if BYO, broker logs if enterprise)
- Enable only necessary permissions
- Review [Twitter's automation rules](https://help.twitter.com/en/rules-and-policies/twitter-automation)

## 📊 API Usage & Limits

This plugin uses Twitter API v2 endpoints efficiently:
- **Home Timeline**: Cached and refreshed periodically
- **Tweet Creation**: Rate limited automatically
- **User Lookups**: Cached to reduce calls
- **Search**: Configurable intervals

Monitor your usage:
- **BYO developer account**: https://developer.twitter.com/en/portal/dashboard
- **Broker/enterprise**: use your broker's dashboard/logs

## 📖 Additional Resources

- [Twitter API v2 Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [Twitter OAuth 1.0a Guide](https://developer.twitter.com/en/docs/authentication/oauth-1-0a)
- [Twitter OAuth 2.0 (Authorization Code with PKCE)](https://developer.twitter.com/en/docs/authentication/oauth-2-0/authorization-code)
- [Rate Limits Reference](https://developer.twitter.com/en/docs/twitter-api/rate-limits)
- [ElizaOS Documentation](https://github.com/elizaos/eliza)

## 🤝 Contributing

Contributions are welcome! Please:
1. Check existing issues first
2. Follow the code style
3. Add tests for new features
4. Update documentation

## 📝 License

This plugin is part of the ElizaOS project. See the main repository for license information.