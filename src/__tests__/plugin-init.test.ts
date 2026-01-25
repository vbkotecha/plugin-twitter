import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger } from "@elizaos/core";
import { TwitterPlugin } from "../index";

describe("TwitterPlugin init", () => {
  const logSpy = vi.spyOn(logger, "log").mockImplementation(() => {});
  const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

  beforeEach(() => {
    logSpy.mockClear();
    warnSpy.mockClear();
  });

  it("warns when env credentials are missing", async () => {
    const runtime: any = {
      getSetting: vi.fn((key: string) =>
        key === "TWITTER_AUTH_MODE" ? "env" : undefined,
      ),
    };
    await TwitterPlugin.init({}, runtime);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("logs when env credentials are present", async () => {
    const runtime: any = {
      getSetting: vi.fn((key: string) => {
        const values: Record<string, string> = {
          TWITTER_AUTH_MODE: "env",
          TWITTER_API_KEY: "key",
          TWITTER_API_SECRET_KEY: "secret",
          TWITTER_ACCESS_TOKEN: "token",
          TWITTER_ACCESS_TOKEN_SECRET: "token-secret",
        };
        return values[key];
      }),
    };
    await TwitterPlugin.init({}, runtime);
    expect(logSpy).toHaveBeenCalledWith("✅ Twitter env credentials found");
  });

  it("warns when oauth config is missing", async () => {
    const runtime: any = {
      getSetting: vi.fn((key: string) =>
        key === "TWITTER_AUTH_MODE" ? "oauth" : undefined,
      ),
    };
    await TwitterPlugin.init({}, runtime);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("logs when oauth config is present", async () => {
    const runtime: any = {
      getSetting: vi.fn((key: string) => {
        const values: Record<string, string> = {
          TWITTER_AUTH_MODE: "oauth",
          TWITTER_CLIENT_ID: "client-id",
          TWITTER_REDIRECT_URI: "http://127.0.0.1/callback",
        };
        return values[key];
      }),
    };
    await TwitterPlugin.init({}, runtime);
    expect(logSpy).toHaveBeenCalledWith("✅ Twitter OAuth configuration found");
  });

  it("warns when broker config is missing", async () => {
    const runtime: any = {
      getSetting: vi.fn((key: string) =>
        key === "TWITTER_AUTH_MODE" ? "broker" : undefined,
      ),
    };
    await TwitterPlugin.init({}, runtime);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("logs when broker config is present", async () => {
    const runtime: any = {
      getSetting: vi.fn((key: string) => {
        const values: Record<string, string> = {
          TWITTER_AUTH_MODE: "broker",
          TWITTER_BROKER_URL: "https://broker.example.com",
          TWITTER_BROKER_API_KEY: "agent-key",
        };
        return values[key];
      }),
    };
    await TwitterPlugin.init({}, runtime);
    expect(logSpy).toHaveBeenCalledWith("✅ Twitter broker configuration found");
  });

  it("warns on invalid auth mode", async () => {
    const runtime: any = {
      getSetting: vi.fn(() => "invalid"),
    };
    await TwitterPlugin.init({}, runtime);
    expect(warnSpy).toHaveBeenCalledWith(
      "Invalid TWITTER_AUTH_MODE=invalid. Expected env|oauth|broker.",
    );
  });

  it("defaults to env mode when auth mode is unset", async () => {
    const runtime: any = {
      getSetting: vi.fn(() => undefined),
    };
    await TwitterPlugin.init({}, runtime);
    expect(warnSpy).toHaveBeenCalled();
  });
});
