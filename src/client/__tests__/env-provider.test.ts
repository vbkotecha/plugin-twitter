import { describe, it, expect, vi } from "vitest";
import { EnvAuthProvider } from "../auth-providers/env";

describe("EnvAuthProvider", () => {
  it("reads credentials from runtime settings", async () => {
    const runtime: any = {
      getSetting: vi.fn((key: string) => {
        const values: Record<string, string> = {
          TWITTER_API_KEY: "api-key",
          TWITTER_API_SECRET_KEY: "api-secret",
          TWITTER_ACCESS_TOKEN: "access-token",
          TWITTER_ACCESS_TOKEN_SECRET: "access-secret",
        };
        return values[key];
      }),
    };

    const provider = new EnvAuthProvider(runtime);
    const creds = await provider.getOAuth1Credentials();
    expect(creds).toEqual({
      appKey: "api-key",
      appSecret: "api-secret",
      accessToken: "access-token",
      accessSecret: "access-secret",
    });

    const token = await provider.getAccessToken();
    expect(token).toBe("access-token");
  });

  it("prefers explicit state over runtime settings", async () => {
    const runtime: any = {
      getSetting: vi.fn(() => "runtime"),
    };

    const provider = new EnvAuthProvider(runtime, {
      TWITTER_API_KEY: "state-key",
      TWITTER_API_SECRET_KEY: "state-secret",
      TWITTER_ACCESS_TOKEN: "state-token",
      TWITTER_ACCESS_TOKEN_SECRET: "state-secret-token",
    });

    const creds = await provider.getOAuth1Credentials();
    expect(creds.appKey).toBe("state-key");
    expect(runtime.getSetting).not.toHaveBeenCalled();
  });

  it("throws a clear error when any credential is missing", async () => {
    const runtime: any = {
      getSetting: vi.fn((key: string) => (key === "TWITTER_API_KEY" ? "key" : undefined)),
    };

    const provider = new EnvAuthProvider(runtime);
    await expect(provider.getOAuth1Credentials()).rejects.toThrow(
      "Missing required Twitter env credentials",
    );
  });

  it("throws when TWITTER_API_KEY is missing", async () => {
    const runtime: any = {
      getSetting: vi.fn((key: string) => {
        const values: Record<string, string> = {
          TWITTER_API_SECRET_KEY: "secret",
          TWITTER_ACCESS_TOKEN: "token",
          TWITTER_ACCESS_TOKEN_SECRET: "token-secret",
        };
        return values[key];
      }),
    };

    const provider = new EnvAuthProvider(runtime);
    await expect(provider.getOAuth1Credentials()).rejects.toThrow(
      "TWITTER_API_KEY",
    );
  });
});
