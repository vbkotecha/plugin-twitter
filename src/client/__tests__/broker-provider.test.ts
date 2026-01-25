import { describe, it, expect, vi } from "vitest";
import { BrokerAuthProvider } from "../auth-providers/broker";

describe("BrokerAuthProvider", () => {
  it("throws when TWITTER_BROKER_URL is missing", async () => {
    const runtime: any = {
      getSetting: vi.fn((key: string) => (key === "TWITTER_BROKER_API_KEY" ? "key" : undefined)),
    };

    const provider = new BrokerAuthProvider(runtime, vi.fn() as any);
    await expect(provider.getAccessToken()).rejects.toThrow(
      "TWITTER_BROKER_URL",
    );
  });

  it("throws when TWITTER_BROKER_API_KEY is missing", async () => {
    const runtime: any = {
      getSetting: vi.fn((key: string) =>
        key === "TWITTER_BROKER_URL" ? "https://broker.example.com" : undefined,
      ),
    };

    const provider = new BrokerAuthProvider(runtime, vi.fn() as any);
    await expect(provider.getAccessToken()).rejects.toThrow(
      "TWITTER_BROKER_API_KEY",
    );
  });

  it("throws when TWITTER_BROKER_URL is invalid", async () => {
    const runtime: any = {
      getSetting: vi.fn((key: string) => {
        if (key === "TWITTER_BROKER_URL") return "not-a-url";
        if (key === "TWITTER_BROKER_API_KEY") return "broker-api-key";
        return undefined;
      }),
    };

    const provider = new BrokerAuthProvider(runtime, vi.fn() as any);
    await expect(provider.getAccessToken()).rejects.toThrow(
      "Invalid TWITTER_BROKER_URL",
    );
  });

  it("throws when broker fetch fails", async () => {
    const fetchImpl = vi.fn(() => {
      throw new Error("network down");
    });

    const runtime: any = {
      getSetting: vi.fn((key: string) => {
        if (key === "TWITTER_BROKER_URL") return "https://broker.example.com";
        if (key === "TWITTER_BROKER_API_KEY") return "broker-api-key";
        return undefined;
      }),
    };

    const provider = new BrokerAuthProvider(runtime, fetchImpl as any);
    await expect(provider.getAccessToken()).rejects.toThrow(
      "Failed to reach Twitter broker",
    );
  });

  it("handles non-Error fetch failures", async () => {
    const fetchImpl = vi.fn(() => {
      throw "boom";
    });

    const runtime: any = {
      getSetting: vi.fn((key: string) => {
        if (key === "TWITTER_BROKER_URL") return "https://broker.example.com";
        if (key === "TWITTER_BROKER_API_KEY") return "broker-api-key";
        return undefined;
      }),
    };

    const provider = new BrokerAuthProvider(runtime, fetchImpl as any);
    await expect(provider.getAccessToken()).rejects.toThrow(
      "Failed to reach Twitter broker",
    );
  });

  it("requests access token from the broker", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "broker-access-token",
        expires_at: Date.now() + 60_000,
      }),
    }));

    const runtime: any = {
      getSetting: vi.fn((key: string) => {
        if (key === "TWITTER_BROKER_URL") return "https://broker.example.com";
        if (key === "TWITTER_BROKER_API_KEY") return "broker-api-key";
        return undefined;
      }),
    };

    const provider = new BrokerAuthProvider(runtime, fetchImpl as any);
    const token = await provider.getAccessToken();
    expect(token).toBe("broker-access-token");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://broker.example.com/v1/twitter/access-token",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "Bearer broker-api-key",
        }),
      }),
    );
  });

  it("accepts expires_at as a string number", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "broker-access-token",
        expires_at: String(Date.now() + 60_000),
      }),
    }));

    const runtime: any = {
      getSetting: vi.fn((key: string) => {
        if (key === "TWITTER_BROKER_URL") return "https://broker.example.com";
        if (key === "TWITTER_BROKER_API_KEY") return "broker-api-key";
        return undefined;
      }),
    };

    const provider = new BrokerAuthProvider(runtime, fetchImpl as any);
    const token = await provider.getAccessToken();
    expect(token).toBe("broker-access-token");
  });

  it("throws clear errors for non-ok broker responses", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 403,
      json: async () => ({ error: "forbidden" }),
    }));

    const runtime: any = {
      getSetting: vi.fn((key: string) => {
        if (key === "TWITTER_BROKER_URL") return "https://broker.example.com";
        if (key === "TWITTER_BROKER_API_KEY") return "broker-api-key";
        return undefined;
      }),
    };

    const provider = new BrokerAuthProvider(runtime, fetchImpl as any);
    await expect(provider.getAccessToken()).rejects.toThrow(
      "Twitter broker token request failed (403)",
    );
  });

  it("omits auth hint for non-auth failures", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: "server_error" }),
    }));

    const runtime: any = {
      getSetting: vi.fn((key: string) => {
        if (key === "TWITTER_BROKER_URL") return "https://broker.example.com";
        if (key === "TWITTER_BROKER_API_KEY") return "broker-api-key";
        return undefined;
      }),
    };

    const provider = new BrokerAuthProvider(runtime, fetchImpl as any);
    await expect(provider.getAccessToken()).rejects.toThrow(
      "Twitter broker token request failed (500)",
    );
  });

  it("handles missing response body on error", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error("bad json");
      },
    }));

    const runtime: any = {
      getSetting: vi.fn((key: string) => {
        if (key === "TWITTER_BROKER_URL") return "https://broker.example.com";
        if (key === "TWITTER_BROKER_API_KEY") return "broker-api-key";
        return undefined;
      }),
    };

    const provider = new BrokerAuthProvider(runtime, fetchImpl as any);
    await expect(provider.getAccessToken()).rejects.toThrow(
      "Twitter broker token request failed (502): no response body.",
    );
  });

  it("rejects responses missing required fields", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ expires_at: Date.now() + 60_000 }),
    }));

    const runtime: any = {
      getSetting: vi.fn((key: string) => {
        if (key === "TWITTER_BROKER_URL") return "https://broker.example.com";
        if (key === "TWITTER_BROKER_API_KEY") return "broker-api-key";
        return undefined;
      }),
    };

    const provider = new BrokerAuthProvider(runtime, fetchImpl as any);
    await expect(provider.getAccessToken()).rejects.toThrow(
      "Twitter broker response missing access_token",
    );
  });

  it("rejects responses missing expires_at", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "token-only" }),
    }));

    const runtime: any = {
      getSetting: vi.fn((key: string) => {
        if (key === "TWITTER_BROKER_URL") return "https://broker.example.com";
        if (key === "TWITTER_BROKER_API_KEY") return "broker-api-key";
        return undefined;
      }),
    };

    const provider = new BrokerAuthProvider(runtime, fetchImpl as any);
    await expect(provider.getAccessToken()).rejects.toThrow(
      "Twitter broker response missing expires_at",
    );
  });
});

