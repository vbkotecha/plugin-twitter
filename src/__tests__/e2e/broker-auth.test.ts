import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { BrokerAuthProvider } from "../../client/auth-providers/broker";
import { startMockBrokerServer, type MockBrokerServer } from "../helpers/mock-broker";

describe("BrokerAuthProvider E2E", () => {
  let broker: MockBrokerServer;

  beforeAll(async () => {
    broker = await startMockBrokerServer({
      expectedApiKey: "test-api-key",
      accessToken: "broker-token",
    });
  });

  afterAll(async () => {
    await broker.close();
  });

  it("fetches token from a local broker", async () => {
    const runtime: any = {
      getSetting: (key: string) => {
        if (key === "TWITTER_BROKER_URL") return broker.baseUrl;
        if (key === "TWITTER_BROKER_API_KEY") return "test-api-key";
        return undefined;
      },
    };

    const provider = new BrokerAuthProvider(runtime);
    const token = await provider.getAccessToken();

    expect(token).toBe("broker-token");
    expect(broker.getLastAuthHeader()).toBe("Bearer test-api-key");
  });

  it("surfaces broker auth failures clearly", async () => {
    const runtime: any = {
      getSetting: (key: string) => {
        if (key === "TWITTER_BROKER_URL") return broker.baseUrl;
        if (key === "TWITTER_BROKER_API_KEY") return "wrong-key";
        return undefined;
      },
    };

    const provider = new BrokerAuthProvider(runtime);
    await expect(provider.getAccessToken()).rejects.toThrow(
      "Twitter broker token request failed (401)",
    );
  });
});
