import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateTwitterConfig,
  shouldTargetUser,
  twitterEnvSchema,
  getTargetUsers,
  getRandomInterval,
  loadConfig,
  loadConfigFromFile,
  validateConfig,
} from "../environment";
import type { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

describe("Environment Configuration", () => {
  let mockRuntime: IAgentRuntime;

  beforeEach(() => {
    mockRuntime = {
      getSetting: vi.fn(),
      character: {},
      agentId: "agent-123" as any,
    } as any;

    // Clear environment variables
    vi.stubEnv("TWITTER_API_KEY", "");
    vi.stubEnv("TWITTER_API_SECRET_KEY", "");
    vi.stubEnv("TWITTER_ACCESS_TOKEN", "");
    vi.stubEnv("TWITTER_ACCESS_TOKEN_SECRET", "");
    vi.stubEnv("TWITTER_AUTH_MODE", "");
    vi.stubEnv("TWITTER_CLIENT_ID", "");
    vi.stubEnv("TWITTER_REDIRECT_URI", "");
    vi.stubEnv("TWITTER_BROKER_URL", "");
    vi.stubEnv("TWITTER_BROKER_API_KEY", "");
  });

  describe("shouldTargetUser", () => {
    it("should return true when no target users specified", () => {
      expect(shouldTargetUser("anyuser", "")).toBe(true);
      expect(shouldTargetUser("anyuser", "  ")).toBe(true);
    });

    it("should return true when wildcard is specified", () => {
      expect(shouldTargetUser("anyuser", "*")).toBe(true);
      expect(shouldTargetUser("someuser", "user1,*,user2")).toBe(true);
    });

    it("should match specific users", () => {
      const targetUsers = "alice,bob,charlie";

      expect(shouldTargetUser("alice", targetUsers)).toBe(true);
      expect(shouldTargetUser("bob", targetUsers)).toBe(true);
      expect(shouldTargetUser("charlie", targetUsers)).toBe(true);
      expect(shouldTargetUser("dave", targetUsers)).toBe(false);
    });

    it("should handle @ symbols in usernames", () => {
      const targetUsers = "@alice,bob,@charlie";

      expect(shouldTargetUser("@alice", targetUsers)).toBe(true);
      expect(shouldTargetUser("alice", targetUsers)).toBe(true);
      expect(shouldTargetUser("@bob", targetUsers)).toBe(true);
      expect(shouldTargetUser("bob", targetUsers)).toBe(true);
    });

    it("should be case insensitive", () => {
      const targetUsers = "Alice,BOB,ChArLiE";

      expect(shouldTargetUser("alice", targetUsers)).toBe(true);
      expect(shouldTargetUser("ALICE", targetUsers)).toBe(true);
      expect(shouldTargetUser("bob", targetUsers)).toBe(true);
      expect(shouldTargetUser("charlie", targetUsers)).toBe(true);
    });
  });

  describe("getTargetUsers", () => {
    it("returns empty list when wildcard is present", () => {
      expect(getTargetUsers("alice,*,bob")).toEqual(["alice", "bob"]);
    });

    it("returns trimmed users", () => {
      expect(getTargetUsers(" alice , bob ")).toEqual(["alice", "bob"]);
    });

    it("returns empty list for empty input", () => {
      expect(getTargetUsers("")).toEqual([]);
    });
  });

  describe("validateTwitterConfig", () => {
    it("should validate config with all required API credentials", async () => {
      mockRuntime.getSetting = vi.fn((key) => {
        const settings = {
          TWITTER_API_KEY: "test-api-key",
          TWITTER_API_SECRET_KEY: "test-api-secret",
          TWITTER_ACCESS_TOKEN: "test-access-token",
          TWITTER_ACCESS_TOKEN_SECRET: "test-access-secret",
        };
        return settings[key];
      });

      const config = await validateTwitterConfig(mockRuntime);

      expect(config.TWITTER_API_KEY).toBe("test-api-key");
      expect(config.TWITTER_API_SECRET_KEY).toBe("test-api-secret");
      expect(config.TWITTER_ACCESS_TOKEN).toBe("test-access-token");
      expect(config.TWITTER_ACCESS_TOKEN_SECRET).toBe("test-access-secret");
    });

    it("defaults auth mode to env when missing", async () => {
      const originalEnv = {
        TWITTER_AUTH_MODE: process.env.TWITTER_AUTH_MODE,
        TWITTER_BROKER_URL: process.env.TWITTER_BROKER_URL,
        TWITTER_BROKER_API_KEY: process.env.TWITTER_BROKER_API_KEY,
      };
      delete process.env.TWITTER_AUTH_MODE;
      delete process.env.TWITTER_BROKER_URL;
      delete process.env.TWITTER_BROKER_API_KEY;

      mockRuntime.getSetting = vi.fn((key) => {
        const settings = {
          TWITTER_API_KEY: "test-api-key",
          TWITTER_API_SECRET_KEY: "test-api-secret",
          TWITTER_ACCESS_TOKEN: "test-access-token",
          TWITTER_ACCESS_TOKEN_SECRET: "test-access-secret",
        };
        return settings[key];
      });

      const config = await validateTwitterConfig(mockRuntime);
      expect(config.TWITTER_AUTH_MODE).toBe("env");
      expect(config.TWITTER_BROKER_URL).toBe("");
      expect(config.TWITTER_BROKER_API_KEY).toBe("");

      process.env.TWITTER_AUTH_MODE = originalEnv.TWITTER_AUTH_MODE;
      process.env.TWITTER_BROKER_URL = originalEnv.TWITTER_BROKER_URL;
      process.env.TWITTER_BROKER_API_KEY = originalEnv.TWITTER_BROKER_API_KEY;
    });

    it("defaults optional oauth fields when broker mode is used", async () => {
      const originalEnv = {
        TWITTER_API_KEY: process.env.TWITTER_API_KEY,
        TWITTER_API_SECRET_KEY: process.env.TWITTER_API_SECRET_KEY,
        TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
        TWITTER_ACCESS_TOKEN_SECRET: process.env.TWITTER_ACCESS_TOKEN_SECRET,
        TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
        TWITTER_REDIRECT_URI: process.env.TWITTER_REDIRECT_URI,
        TWITTER_BROKER_URL: process.env.TWITTER_BROKER_URL,
        TWITTER_BROKER_API_KEY: process.env.TWITTER_BROKER_API_KEY,
      };
      delete process.env.TWITTER_API_KEY;
      delete process.env.TWITTER_API_SECRET_KEY;
      delete process.env.TWITTER_ACCESS_TOKEN;
      delete process.env.TWITTER_ACCESS_TOKEN_SECRET;
      delete process.env.TWITTER_CLIENT_ID;
      delete process.env.TWITTER_REDIRECT_URI;
      delete process.env.TWITTER_BROKER_URL;
      delete process.env.TWITTER_BROKER_API_KEY;

      mockRuntime.getSetting = vi.fn(() => undefined);

      const config = await validateTwitterConfig(mockRuntime, {
        TWITTER_AUTH_MODE: "broker",
        TWITTER_BROKER_URL: "https://broker.example.com",
        TWITTER_BROKER_API_KEY: "broker-key",
      });

      expect(config.TWITTER_ACCESS_TOKEN).toBe("");
      expect(config.TWITTER_ACCESS_TOKEN_SECRET).toBe("");
      expect(config.TWITTER_CLIENT_ID).toBe("");
      expect(config.TWITTER_REDIRECT_URI).toBe("");
      expect(config.TWITTER_BROKER_URL).toBe("https://broker.example.com");
      expect(config.TWITTER_BROKER_API_KEY).toBe("broker-key");

      process.env.TWITTER_API_KEY = originalEnv.TWITTER_API_KEY;
      process.env.TWITTER_API_SECRET_KEY = originalEnv.TWITTER_API_SECRET_KEY;
      process.env.TWITTER_ACCESS_TOKEN = originalEnv.TWITTER_ACCESS_TOKEN;
      process.env.TWITTER_ACCESS_TOKEN_SECRET = originalEnv.TWITTER_ACCESS_TOKEN_SECRET;
      process.env.TWITTER_CLIENT_ID = originalEnv.TWITTER_CLIENT_ID;
      process.env.TWITTER_REDIRECT_URI = originalEnv.TWITTER_REDIRECT_URI;
      process.env.TWITTER_BROKER_URL = originalEnv.TWITTER_BROKER_URL;
      process.env.TWITTER_BROKER_API_KEY = originalEnv.TWITTER_BROKER_API_KEY;
    });

    it("should throw error when required credentials are missing", async () => {
      mockRuntime.getSetting = vi.fn(() => undefined);

      await expect(validateTwitterConfig(mockRuntime)).rejects.toThrow(
        "Twitter env auth is selected",
      );
    });

    it("should validate oauth mode without legacy env credentials", async () => {
      mockRuntime.getSetting = vi.fn((key) => {
        const settings: Record<string, string> = {
          TWITTER_AUTH_MODE: "oauth",
          TWITTER_CLIENT_ID: "client-id",
          TWITTER_REDIRECT_URI: "http://127.0.0.1:8080/callback",
        };
        return settings[key];
      });

      const config = await validateTwitterConfig(mockRuntime);
      expect(config.TWITTER_AUTH_MODE).toBe("oauth");
      expect(config.TWITTER_CLIENT_ID).toBe("client-id");
      expect(config.TWITTER_REDIRECT_URI).toBe("http://127.0.0.1:8080/callback");
    });

    it("uses config override for redirect uri", async () => {
      mockRuntime.getSetting = vi.fn((key) => {
        const settings: Record<string, string> = {
          TWITTER_AUTH_MODE: "oauth",
          TWITTER_CLIENT_ID: "client-id",
        };
        return settings[key];
      });

      const config = await validateTwitterConfig(mockRuntime, {
        TWITTER_REDIRECT_URI: "http://127.0.0.1:8080/override",
      });
      expect(config.TWITTER_REDIRECT_URI).toBe("http://127.0.0.1:8080/override");
    });

    it("should throw when oauth mode is missing required fields", async () => {
      mockRuntime.getSetting = vi.fn((key) => {
        const settings: Record<string, string> = {
          TWITTER_AUTH_MODE: "oauth",
          TWITTER_CLIENT_ID: "client-id",
          // missing redirect uri
        };
        return settings[key];
      });

      await expect(validateTwitterConfig(mockRuntime)).rejects.toThrow(
        "Twitter OAuth is selected",
      );
    });

    it("should throw for invalid auth mode", async () => {
      mockRuntime.getSetting = vi.fn((key) => {
        const settings: Record<string, string> = {
          TWITTER_AUTH_MODE: "invalid",
        };
        return settings[key];
      });

      await expect(validateTwitterConfig(mockRuntime)).rejects.toThrow(
        "Invalid TWITTER_AUTH_MODE",
      );
    });

    it("rethrows non-zod errors", async () => {
      mockRuntime.getSetting = vi.fn(() => {
        throw new Error("settings failed");
      });

      await expect(validateTwitterConfig(mockRuntime)).rejects.toThrow(
        "settings failed",
      );
    });

    it("should throw when broker mode is missing broker url", async () => {
      mockRuntime.getSetting = vi.fn((key) => {
        const settings: Record<string, string> = {
          TWITTER_AUTH_MODE: "broker",
        };
        return settings[key];
      });

      await expect(validateTwitterConfig(mockRuntime)).rejects.toThrow(
        "Twitter broker auth is selected",
      );
    });

    it("should throw when broker mode is missing broker api key", async () => {
      mockRuntime.getSetting = vi.fn((key) => {
        const settings: Record<string, string> = {
          TWITTER_AUTH_MODE: "broker",
          TWITTER_BROKER_URL: "https://broker.example.com",
        };
        return settings[key];
      });

      await expect(validateTwitterConfig(mockRuntime)).rejects.toThrow(
        "TWITTER_BROKER_API_KEY",
      );
    });

    it("should validate broker mode with url and api key", async () => {
      mockRuntime.getSetting = vi.fn((key) => {
        const settings: Record<string, string> = {
          TWITTER_AUTH_MODE: "broker",
          TWITTER_BROKER_URL: "https://broker.example.com",
          TWITTER_BROKER_API_KEY: "agent-key",
        };
        return settings[key];
      });

      const config = await validateTwitterConfig(mockRuntime);
      expect(config.TWITTER_AUTH_MODE).toBe("broker");
      expect(config.TWITTER_BROKER_URL).toBe("https://broker.example.com");
      expect(config.TWITTER_BROKER_API_KEY).toBe("agent-key");
    });

    it("uses config overrides for broker settings", async () => {
      mockRuntime.getSetting = vi.fn(() => undefined);

      const config = await validateTwitterConfig(mockRuntime, {
        TWITTER_AUTH_MODE: "broker",
        TWITTER_BROKER_URL: "https://config-broker.example.com",
        TWITTER_BROKER_API_KEY: "config-key",
      });

      expect(config.TWITTER_BROKER_URL).toBe("https://config-broker.example.com");
      expect(config.TWITTER_BROKER_API_KEY).toBe("config-key");
    });

    it("should use default values for optional settings", async () => {
      mockRuntime.getSetting = vi.fn((key) => {
        const settings = {
          TWITTER_API_KEY: "test-api-key",
          TWITTER_API_SECRET_KEY: "test-api-secret",
          TWITTER_ACCESS_TOKEN: "test-access-token",
          TWITTER_ACCESS_TOKEN_SECRET: "test-access-secret",
        };
        return settings[key];
      });

      const config = await validateTwitterConfig(mockRuntime);

      // Check default values
      expect(config.TWITTER_RETRY_LIMIT).toBe("5");
      expect(config.TWITTER_POST_INTERVAL_MIN).toBe("90");
      expect(config.TWITTER_POST_INTERVAL_MAX).toBe("180");
      expect(config.TWITTER_ENABLE_POST).toBe("false");
      expect(config.TWITTER_DRY_RUN).toBe("false");
    });

    it("should parse boolean settings correctly", async () => {
      mockRuntime.getSetting = vi.fn((key) => {
        const settings = {
          TWITTER_API_KEY: "test-api-key",
          TWITTER_API_SECRET_KEY: "test-api-secret",
          TWITTER_ACCESS_TOKEN: "test-access-token",
          TWITTER_ACCESS_TOKEN_SECRET: "test-access-secret",
          TWITTER_ENABLE_POST: "true",
          TWITTER_DRY_RUN: "false",
        };
        return settings[key];
      });

      const config = await validateTwitterConfig(mockRuntime);

      expect(config.TWITTER_ENABLE_POST).toBe("true");
      expect(config.TWITTER_DRY_RUN).toBe("false");
    });

    it("uses config override for enable replies", async () => {
      mockRuntime.getSetting = vi.fn((key) => {
        const settings = {
          TWITTER_API_KEY: "test-api-key",
          TWITTER_API_SECRET_KEY: "test-api-secret",
          TWITTER_ACCESS_TOKEN: "test-access-token",
          TWITTER_ACCESS_TOKEN_SECRET: "test-access-secret",
          TWITTER_ENABLE_REPLIES: "true",
        };
        return settings[key];
      });

      const config = await validateTwitterConfig(mockRuntime, {
        TWITTER_ENABLE_REPLIES: "false",
      });
      expect(config.TWITTER_ENABLE_REPLIES).toBe("false");
    });

    it("should handle partial config override", async () => {
      mockRuntime.getSetting = vi.fn((key) => {
        const settings = {
          TWITTER_API_KEY: "runtime-api-key",
          TWITTER_API_SECRET_KEY: "runtime-api-secret",
          TWITTER_ACCESS_TOKEN: "runtime-access-token",
          TWITTER_ACCESS_TOKEN_SECRET: "runtime-access-secret",
          TWITTER_POST_INTERVAL_MIN: "30",
        };
        return settings[key];
      });

      const partialConfig = {
        TWITTER_POST_INTERVAL_MIN: "60",
        TWITTER_POST_INTERVAL_MAX: "120",
      };

      const config = await validateTwitterConfig(mockRuntime, partialConfig);

      // Should use partial config value
      expect(config.TWITTER_POST_INTERVAL_MIN).toBe("60");
      expect(config.TWITTER_POST_INTERVAL_MAX).toBe("120");
      // Should use runtime value
      expect(config.TWITTER_API_KEY).toBe("runtime-api-key");
    });

    it("should prioritize config over runtime over env", async () => {
      vi.stubEnv("TWITTER_API_KEY", "env-api-key");

      mockRuntime.getSetting = vi.fn((key) => {
        if (key === "TWITTER_API_KEY") return "runtime-api-key";
        if (key === "TWITTER_API_SECRET_KEY") return "test-secret";
        if (key === "TWITTER_ACCESS_TOKEN") return "test-token";
        if (key === "TWITTER_ACCESS_TOKEN_SECRET") return "test-token-secret";
        return undefined;
      });

      const config = await validateTwitterConfig(mockRuntime, {
        TWITTER_API_KEY: "config-api-key",
      });

      expect(config.TWITTER_API_KEY).toBe("config-api-key");
    });

    it("should parse target users correctly", async () => {
      mockRuntime.getSetting = vi.fn((key) => {
        const settings = {
          TWITTER_API_KEY: "test-api-key",
          TWITTER_API_SECRET_KEY: "test-api-secret",
          TWITTER_ACCESS_TOKEN: "test-access-token",
          TWITTER_ACCESS_TOKEN_SECRET: "test-access-secret",
          TWITTER_TARGET_USERS: "alice,bob,charlie",
        };
        return settings[key];
      });

      const config = await validateTwitterConfig(mockRuntime);

      expect(config.TWITTER_TARGET_USERS).toBe("alice,bob,charlie");
    });

    it("should handle zod validation errors", async () => {
      mockRuntime.getSetting = vi.fn((key) => {
        const settings = {
          TWITTER_API_KEY: "test-api-key",
          TWITTER_API_SECRET_KEY: "test-api-secret",
          TWITTER_ACCESS_TOKEN: "test-access-token",
          TWITTER_ACCESS_TOKEN_SECRET: "test-access-secret",
        };
        return settings[key];
      });

      // Create a scenario that will fail zod validation without failing auth checks
      const invalidConfig = {
        TWITTER_TARGET_USERS: 123, // Should be string
      };

      await expect(
        validateTwitterConfig(mockRuntime, invalidConfig as any),
      ).rejects.toThrow();
    });

  });

  describe("twitterEnvSchema", () => {
    it("should validate a complete configuration", () => {
      const validConfig = {
        TWITTER_API_KEY: "test-key",
        TWITTER_API_SECRET_KEY: "test-secret",
        TWITTER_ACCESS_TOKEN: "test-token",
        TWITTER_ACCESS_TOKEN_SECRET: "test-token-secret",
        TWITTER_TARGET_USERS: "user1,user2",
        TWITTER_RETRY_LIMIT: "3",
        TWITTER_POST_INTERVAL_MIN: "10",
        TWITTER_POST_INTERVAL_MAX: "20",
        TWITTER_ENABLE_POST: "false",
        TWITTER_DRY_RUN: "true",
      };

      const result = twitterEnvSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it("should allow optional fields", () => {
      const minimalConfig = {};

      const result = twitterEnvSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);

      if (result.success) {
        // Should have default for TWITTER_TARGET_USERS
        expect(result.data.TWITTER_TARGET_USERS).toBe("");
        expect(result.data.TWITTER_MAX_ENGAGEMENTS_PER_RUN).toBe("5");
        expect(result.data.TWITTER_BROKER_URL).toBe("");
        expect(result.data.TWITTER_BROKER_API_KEY).toBe("");
      }
    });

    it("should reject invalid types", () => {
      const invalidConfig = {
        TWITTER_API_KEY: 123, // Should be string
      };

      const result = twitterEnvSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe("loadConfig helpers", () => {
    it("loadConfigFromFile returns empty config", () => {
      expect(loadConfigFromFile()).toEqual({});
    });

    it("loadConfig merges env defaults and overrides", () => {
      vi.stubEnv("TWITTER_AUTH_MODE", "broker");
      vi.stubEnv("TWITTER_BROKER_URL", "https://broker.example.com");
      vi.stubEnv("TWITTER_BROKER_API_KEY", "agent-key");

      const config = loadConfig();
      expect(config.TWITTER_AUTH_MODE).toBe("broker");
      expect(config.TWITTER_BROKER_URL).toBe("https://broker.example.com");
      expect(config.TWITTER_BROKER_API_KEY).toBe("agent-key");
    });

    it("validateConfig parses schema", () => {
      const config = validateConfig({ TWITTER_AUTH_MODE: "env" });
      expect(config.TWITTER_AUTH_MODE).toBe("env");
    });

    it("loadConfig works when process is undefined", () => {
      const originalProcess = (globalThis as any).process;
      Object.defineProperty(globalThis, "process", {
        value: undefined,
        configurable: true,
      });

      const config = loadConfig();
      expect(config.TWITTER_AUTH_MODE).toBe("env");

      Object.defineProperty(globalThis, "process", {
        value: originalProcess,
        configurable: true,
      });
    });
  });

  describe("getRandomInterval", () => {
    const runtime: any = {
      getSetting: vi.fn(),
      character: {},
      agentId: "agent-123" as any,
    };

    it("uses min/max when configured", () => {
      runtime.getSetting = vi.fn((key: string) => {
        const values: Record<string, string> = {
          TWITTER_POST_INTERVAL_MIN: "10",
          TWITTER_POST_INTERVAL_MAX: "20",
        };
        return values[key];
      });
      const spy = vi.spyOn(Math, "random").mockReturnValue(0.5);
      const value = getRandomInterval(runtime, "post");
      spy.mockRestore();
      expect(value).toBe(15);
    });

    it("falls back to fixed interval when min/max invalid", () => {
      runtime.getSetting = vi.fn((key: string) => {
        const values: Record<string, string> = {
          TWITTER_POST_INTERVAL_MIN: "30",
          TWITTER_POST_INTERVAL_MAX: "10",
          TWITTER_POST_INTERVAL: "120",
        };
        return values[key];
      });
      const value = getRandomInterval(runtime, "post");
      expect(value).toBe(120);
    });

    it("handles non-numeric interval values", () => {
      runtime.getSetting = vi.fn((key: string) => {
        const values: Record<string, string> = {
          TWITTER_POST_INTERVAL: "not-a-number",
        };
        return values[key];
      });
      const value = getRandomInterval(runtime, "post");
      expect(value).toBe(120);
    });

    it("uses engagement fallback when min/max are missing", () => {
      runtime.getSetting = vi.fn((key: string) => {
        const values: Record<string, string> = {
          TWITTER_ENGAGEMENT_INTERVAL: "25",
        };
        return values[key];
      });
      const value = getRandomInterval(runtime, "engagement");
      expect(value).toBe(25);
    });

    it("uses discovery fallback when min/max are missing", () => {
      runtime.getSetting = vi.fn(() => undefined);
      const value = getRandomInterval(runtime, "discovery");
      expect(value).toBe(20);
    });

    it("throws for unknown interval type", () => {
      runtime.getSetting = vi.fn(() => undefined);
      expect(() => getRandomInterval(runtime, "other" as any)).toThrow(
        "Unknown interval type",
      );
    });

    it("uses engagement min/max when provided", () => {
      runtime.getSetting = vi.fn((key: string) => {
        const values: Record<string, string> = {
          TWITTER_ENGAGEMENT_INTERVAL_MIN: "5",
          TWITTER_ENGAGEMENT_INTERVAL_MAX: "15",
        };
        return values[key];
      });
      const spy = vi.spyOn(Math, "random").mockReturnValue(0.5);
      const value = getRandomInterval(runtime, "engagement");
      spy.mockRestore();
      expect(value).toBe(10);
    });

    it("uses discovery min/max when provided", () => {
      runtime.getSetting = vi.fn((key: string) => {
        const values: Record<string, string> = {
          TWITTER_DISCOVERY_INTERVAL_MIN: "8",
          TWITTER_DISCOVERY_INTERVAL_MAX: "12",
        };
        return values[key];
      });
      const spy = vi.spyOn(Math, "random").mockReturnValue(0.25);
      const value = getRandomInterval(runtime, "discovery");
      spy.mockRestore();
      expect(value).toBe(9);
    });
  });
});
