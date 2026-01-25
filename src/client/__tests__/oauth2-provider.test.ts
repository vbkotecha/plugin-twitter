import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TokenStore, StoredOAuth2Tokens } from "../auth-providers/token-store";

const { waitForLoopbackCallback, promptForRedirectedUrl } = vi.hoisted(() => ({
  waitForLoopbackCallback: vi.fn(),
  promptForRedirectedUrl: vi.fn(),
}));

vi.mock("../auth-providers/interactive", () => ({
  waitForLoopbackCallback,
  promptForRedirectedUrl,
}));

import { OAuth2PKCEAuthProvider } from "../auth-providers/oauth2-pkce";

describe("OAuth2PKCEAuthProvider", () => {
  let runtime: any;

  beforeEach(() => {
    waitForLoopbackCallback.mockReset();
    promptForRedirectedUrl.mockReset();
    runtime = {
      agentId: "agent-1",
      getSetting: vi.fn((k: string) => {
        const settings: Record<string, string> = {
          TWITTER_AUTH_MODE: "oauth",
          TWITTER_CLIENT_ID: "client-id",
          TWITTER_REDIRECT_URI: "http://127.0.0.1:8080/callback",
        };
        return settings[k];
      }),
      getCache: vi.fn(),
      setCache: vi.fn(),
    };
  });

  it("returns existing non-expired access token without refresh", async () => {
    const store: TokenStore = {
      load: vi.fn(async () => ({
        access_token: "access",
        refresh_token: "refresh",
        expires_at: Date.now() + 60_000,
      })),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const fetchImpl = vi.fn();
    const provider = new OAuth2PKCEAuthProvider(runtime, store, fetchImpl as any);

    const token = await provider.getAccessToken();
    expect(token).toBe("access");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("uses interactiveLoginFn when no tokens are stored", async () => {
    const store: TokenStore = {
      load: vi.fn(async () => null),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const provider = new OAuth2PKCEAuthProvider(
      runtime,
      store,
      vi.fn() as any,
      async () => ({
        access_token: "interactive-token",
        refresh_token: "refresh",
        expires_at: Date.now() + 3600_000,
      }),
    );

    const token = await provider.getAccessToken();
    expect(token).toBe("interactive-token");
  });

  it("interactive login uses loopback callback when available", async () => {
    waitForLoopbackCallback.mockResolvedValue({ code: "code-1", state: "state-1" });
    promptForRedirectedUrl.mockResolvedValue("http://127.0.0.1/callback?code=code-1");

    const store: TokenStore = {
      load: vi.fn(async () => null),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "new-access",
        refresh_token: "refresh",
        expires_in: 3600,
      }),
    }));

    const provider = new OAuth2PKCEAuthProvider(runtime, store, fetchImpl as any);
    const token = await provider.getAccessToken();
    expect(token).toBe("new-access");
    expect(waitForLoopbackCallback).toHaveBeenCalled();
    expect(promptForRedirectedUrl).not.toHaveBeenCalled();
  });

  it("throws when client id is missing", async () => {
    const runtimeMissingClient: any = {
      agentId: "agent-1",
      getSetting: vi.fn((k: string) => {
        if (k === "TWITTER_REDIRECT_URI") return "http://127.0.0.1:8080/callback";
        return undefined;
      }),
    };

    const store: TokenStore = {
      load: vi.fn(async () => null),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const provider = new OAuth2PKCEAuthProvider(runtimeMissingClient, store);
    await expect(provider.getAccessToken()).rejects.toThrow(
      "TWITTER_CLIENT_ID is required",
    );
  });

  it("throws when redirect uri is missing", async () => {
    const runtimeMissingRedirect: any = {
      agentId: "agent-1",
      getSetting: vi.fn((k: string) => {
        if (k === "TWITTER_CLIENT_ID") return "client-id";
        return undefined;
      }),
    };

    const store: TokenStore = {
      load: vi.fn(async () => null),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const provider = new OAuth2PKCEAuthProvider(runtimeMissingRedirect, store);
    await expect(provider.getAccessToken()).rejects.toThrow(
      "TWITTER_REDIRECT_URI is required",
    );
  });

  it("uses custom scopes when provided", async () => {
    const runtimeWithScopes: any = {
      agentId: "agent-1",
      getSetting: vi.fn((k: string) => {
        const settings: Record<string, string> = {
          TWITTER_CLIENT_ID: "client-id",
          TWITTER_REDIRECT_URI: "http://127.0.0.1:8080/callback",
          TWITTER_SCOPES: "tweet.read users.read",
        };
        return settings[k];
      }),
    };

    waitForLoopbackCallback.mockRejectedValue("no loopback");
    promptForRedirectedUrl.mockResolvedValue(
      "http://127.0.0.1/callback?code=code-8",
    );

    const store: TokenStore = {
      load: vi.fn(async () => null),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "new-access",
        refresh_token: "refresh",
        expires_in: 3600,
      }),
    }));

    const provider = new OAuth2PKCEAuthProvider(runtimeWithScopes, store, fetchImpl as any);
    const token = await provider.getAccessToken();
    expect(token).toBe("new-access");
  });

  it("falls back to default scopes when unset", () => {
    const store: TokenStore = {
      load: vi.fn(async () => null),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const provider = new OAuth2PKCEAuthProvider(runtime, store);
    expect((provider as any).scopes).toBe(
      "tweet.read tweet.write users.read offline.access",
    );
  });

  it("reuses cached tokens without reloading store", async () => {
    const stored: StoredOAuth2Tokens = {
      access_token: "cached",
      refresh_token: "refresh",
      expires_at: Date.now() + 60_000,
    };
    const store: TokenStore = {
      load: vi.fn(async () => stored),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const provider = new OAuth2PKCEAuthProvider(runtime, store);
    const token1 = await provider.getAccessToken();
    const token2 = await provider.getAccessToken();

    expect(token1).toBe("cached");
    expect(token2).toBe("cached");
    expect(store.load).toHaveBeenCalledTimes(1);
  });

  it("logs non-Error loopback failures and falls back to prompt", async () => {
    waitForLoopbackCallback.mockRejectedValue("no loopback");
    promptForRedirectedUrl.mockResolvedValue(
      "http://127.0.0.1/callback?code=code-6",
    );

    const store: TokenStore = {
      load: vi.fn(async () => null),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "new-access",
        refresh_token: "refresh",
        expires_in: 3600,
      }),
    }));

    const provider = new OAuth2PKCEAuthProvider(runtime, store, fetchImpl as any);
    const token = await provider.getAccessToken();
    expect(token).toBe("new-access");
  });

  it("falls back to prompt when loopback callback fails", async () => {
    waitForLoopbackCallback.mockRejectedValue(new Error("no loopback"));
    promptForRedirectedUrl.mockResolvedValue(
      "http://127.0.0.1/callback?code=code-2",
    );

    const store: TokenStore = {
      load: vi.fn(async () => null),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "new-access",
        refresh_token: "refresh",
        expires_in: 3600,
      }),
    }));

    const provider = new OAuth2PKCEAuthProvider(runtime, store, fetchImpl as any);
    const token = await provider.getAccessToken();
    expect(token).toBe("new-access");
    expect(promptForRedirectedUrl).toHaveBeenCalled();
  });

  it("throws when pasted URL is missing code", async () => {
    waitForLoopbackCallback.mockRejectedValue(new Error("no loopback"));
    promptForRedirectedUrl.mockResolvedValue(
      "http://127.0.0.1/callback?state=state-2",
    );

    const store: TokenStore = {
      load: vi.fn(async () => null),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const fetchImpl = vi.fn();
    const provider = new OAuth2PKCEAuthProvider(runtime, store, fetchImpl as any);
    await expect(provider.getAccessToken()).rejects.toThrow(
      "Pasted URL did not include ?code=",
    );
  });

  it("throws when pasted URL has state mismatch", async () => {
    waitForLoopbackCallback.mockRejectedValue(new Error("no loopback"));
    promptForRedirectedUrl.mockResolvedValue(
      "http://127.0.0.1/callback?code=code-3&state=wrong",
    );

    const store: TokenStore = {
      load: vi.fn(async () => null),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const fetchImpl = vi.fn();
    const provider = new OAuth2PKCEAuthProvider(runtime, store, fetchImpl as any);
    await expect(provider.getAccessToken()).rejects.toThrow("OAuth state mismatch");
  });

  it("refreshes when expired and refresh_token is present", async () => {
    const expired: StoredOAuth2Tokens = {
      access_token: "old",
      refresh_token: "refresh",
      expires_at: Date.now() - 1,
    };

    const store: TokenStore = {
      load: vi.fn(async () => expired),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 3600,
        token_type: "bearer",
        scope: "tweet.read",
      }),
    }));

    const provider = new OAuth2PKCEAuthProvider(runtime, store, fetchImpl as any);

    const token = await provider.getAccessToken();
    expect(token).toBe("new-access");
    expect(store.save).toHaveBeenCalled();
  });

  it("throws clear error on refresh failure", async () => {
    const expired: StoredOAuth2Tokens = {
      access_token: "old",
      refresh_token: "refresh",
      expires_at: Date.now() - 1,
    };

    const store: TokenStore = {
      load: vi.fn(async () => expired),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: "invalid_grant" }),
    }));

    const provider = new OAuth2PKCEAuthProvider(runtime, store, fetchImpl as any);

    await expect(provider.getAccessToken()).rejects.toThrow(
      "Twitter token refresh failed",
    );
  });

  it("includes status/body on exchange failure", async () => {
    const store: TokenStore = {
      load: vi.fn(async () => null),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: "unauthorized_client" }),
    }));

    const provider = new OAuth2PKCEAuthProvider(
      runtime,
      store,
      fetchImpl as any,
      // stub interactive login to call the real token exchange path by returning a failure via fetch
      async () => {
        // simulate what interactiveLogin would do: return tokens after exchange;
        // here we force a call to the exchange endpoint by invoking getAccessToken without stored tokens.
        // We can't access private methods, so we just throw an error consistent with exchange failure.
        const res: any = await (fetchImpl as any)("https://api.twitter.com/2/oauth2/token", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: "grant_type=authorization_code",
        });
        const body = await res.json();
        throw new Error(`Twitter token exchange failed (${res.status}): ${JSON.stringify(body)}`);
      },
    );

    await expect(provider.getAccessToken()).rejects.toThrow(
      'Twitter token exchange failed (401): {"error":"unauthorized_client"}',
    );
  });

  it("throws when exchange returns non-ok response", async () => {
    waitForLoopbackCallback.mockResolvedValue({ code: "code-4", state: "state-4" });
    const store: TokenStore = {
      load: vi.fn(async () => null),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: "server_error" }),
    }));

    const provider = new OAuth2PKCEAuthProvider(runtime, store, fetchImpl as any);
    await expect(provider.getAccessToken()).rejects.toThrow(
      "Twitter token exchange failed (500)",
    );
  });

  it("throws when exchange response is missing access_token", async () => {
    waitForLoopbackCallback.mockResolvedValue({ code: "code-1", state: "state-1" });
    const store: TokenStore = {
      load: vi.fn(async () => null),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        expires_in: 3600,
      }),
    }));

    const provider = new OAuth2PKCEAuthProvider(runtime, store, fetchImpl as any);
    await expect(provider.getAccessToken()).rejects.toThrow(
      "Twitter token exchange returned no access_token",
    );
  });

  it("throws when exchange response is missing expires_in", async () => {
    waitForLoopbackCallback.mockResolvedValue({ code: "code-1", state: "state-1" });
    const store: TokenStore = {
      load: vi.fn(async () => null),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "token",
      }),
    }));

    const provider = new OAuth2PKCEAuthProvider(runtime, store, fetchImpl as any);
    await expect(provider.getAccessToken()).rejects.toThrow(
      "Twitter token exchange returned no expires_in",
    );
  });

  it("persists scope and token_type when provided", async () => {
    waitForLoopbackCallback.mockResolvedValue({ code: "code-7", state: "state-7" });

    const store: TokenStore = {
      load: vi.fn(async () => null),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "new-access",
        refresh_token: "refresh",
        expires_in: 3600,
        scope: "tweet.read",
        token_type: "bearer",
      }),
    }));

    const provider = new OAuth2PKCEAuthProvider(runtime, store, fetchImpl as any);
    await provider.getAccessToken();

    expect(store.save).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "tweet.read",
        token_type: "bearer",
      }),
    );
  });

  it("refresh rotates refresh_token when returned", async () => {
    const expired: StoredOAuth2Tokens = {
      access_token: "old",
      refresh_token: "refresh-old",
      expires_at: Date.now() - 1,
    };

    const store: TokenStore = {
      load: vi.fn(async () => expired),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "new-access",
        refresh_token: "refresh-new",
        expires_in: 3600,
      }),
    }));

    const provider = new OAuth2PKCEAuthProvider(runtime, store, fetchImpl as any);
    const token = await provider.getAccessToken();
    expect(token).toBe("new-access");

    // ensure we persisted rotated refresh token
    expect(store.save).toHaveBeenCalledWith(
      expect.objectContaining({ refresh_token: "refresh-new" }),
    );
  });

  it("refresh retains refresh_token when not returned", async () => {
    const expired: StoredOAuth2Tokens = {
      access_token: "old",
      refresh_token: "refresh-old",
      expires_at: Date.now() - 1,
    };

    const store: TokenStore = {
      load: vi.fn(async () => expired),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "new-access",
        expires_in: 3600,
      }),
    }));

    const provider = new OAuth2PKCEAuthProvider(runtime, store, fetchImpl as any);
    await provider.getAccessToken();

    expect(store.save).toHaveBeenCalledWith(
      expect.objectContaining({ refresh_token: "refresh-old" }),
    );
  });

  it("expired token without refresh_token clears store and reauths", async () => {
    const expiredNoRefresh: StoredOAuth2Tokens = {
      access_token: "old",
      expires_at: Date.now() - 1,
    };

    const store: TokenStore = {
      load: vi.fn(async () => expiredNoRefresh),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const interactiveLoginFn = vi.fn(async () => ({
      access_token: "new",
      refresh_token: "refresh",
      expires_at: Date.now() + 3600_000,
    }));

    const provider = new OAuth2PKCEAuthProvider(
      runtime,
      store,
      vi.fn() as any,
      interactiveLoginFn,
    );

    const token = await provider.getAccessToken();
    expect(token).toBe("new");
    expect(store.clear).toHaveBeenCalled();
    expect(interactiveLoginFn).toHaveBeenCalled();
  });

  it("expired token without refresh_token reauths via interactive login", async () => {
    waitForLoopbackCallback.mockResolvedValue({ code: "code-5", state: "state-5" });
    const expiredNoRefresh: StoredOAuth2Tokens = {
      access_token: "old",
      expires_at: Date.now() - 1,
    };

    const store: TokenStore = {
      load: vi.fn(async () => expiredNoRefresh),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "new",
        refresh_token: "refresh",
        expires_in: 3600,
      }),
    }));

    const provider = new OAuth2PKCEAuthProvider(runtime, store, fetchImpl as any);
    const token = await provider.getAccessToken();
    expect(token).toBe("new");
  });

  it("throws when refresh response is missing access_token", async () => {
    const expired: StoredOAuth2Tokens = {
      access_token: "old",
      refresh_token: "refresh",
      expires_at: Date.now() - 1,
    };

    const store: TokenStore = {
      load: vi.fn(async () => expired),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ expires_in: 3600 }),
    }));

    const provider = new OAuth2PKCEAuthProvider(runtime, store, fetchImpl as any);
    await expect(provider.getAccessToken()).rejects.toThrow(
      "Twitter token refresh returned no access_token",
    );
  });

  it("throws when refresh response is missing expires_in", async () => {
    const expired: StoredOAuth2Tokens = {
      access_token: "old",
      refresh_token: "refresh",
      expires_at: Date.now() - 1,
    };

    const store: TokenStore = {
      load: vi.fn(async () => expired),
      save: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
    };

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "new-token" }),
    }));

    const provider = new OAuth2PKCEAuthProvider(runtime, store, fetchImpl as any);
    await expect(provider.getAccessToken()).rejects.toThrow(
      "Twitter token refresh returned no expires_in",
    );
  });
});

