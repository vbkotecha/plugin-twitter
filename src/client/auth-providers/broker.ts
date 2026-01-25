import type { IAgentRuntime } from "@elizaos/core";
import { getSetting } from "../../utils/settings";
import type { TwitterAuthProvider } from "./types";

/**
 * Broker auth provider.
 *
 * Contract (v1):
 * - GET {TWITTER_BROKER_URL}/v1/twitter/access-token
 *   -> { access_token: string, expires_at: number }
 *
 * This plugin intentionally ships NO secrets. The broker handles client secrets
 * and user sessions, returning short-lived access tokens to the agent.
 */
export class BrokerAuthProvider implements TwitterAuthProvider {
  readonly mode = "broker" as const;

  constructor(
    private readonly runtime: IAgentRuntime,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async getAccessToken(): Promise<string> {
    const url = getSetting(this.runtime, "TWITTER_BROKER_URL");
    const apiKey = getSetting(this.runtime, "TWITTER_BROKER_API_KEY");

    const missing: string[] = [];
    if (!url) missing.push("TWITTER_BROKER_URL");
    if (!apiKey) missing.push("TWITTER_BROKER_API_KEY");
    if (missing.length) {
      throw new Error(
        `Twitter broker auth requires ${missing.join(", ")}. ` +
          "Set TWITTER_AUTH_MODE=broker, TWITTER_BROKER_URL, and TWITTER_BROKER_API_KEY. " +
          "The plugin will call GET {TWITTER_BROKER_URL}/v1/twitter/access-token with " +
          "Authorization: Bearer {TWITTER_BROKER_API_KEY}.",
      );
    }

    let endpoint: URL;
    try {
      endpoint = new URL("/v1/twitter/access-token", url);
    } catch (error) {
      throw new Error(
        `Invalid TWITTER_BROKER_URL=${url}. Expected a valid URL (e.g. https://broker.example.com).`,
      );
    }

    let res: any;
    try {
      res = await this.fetchImpl(endpoint.toString(), {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${apiKey}`,
        },
      });
    } catch (error) {
      throw new Error(
        `Failed to reach Twitter broker at ${endpoint.toString()}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const bodyText = body ? JSON.stringify(body) : "no response body";
      const hint =
        res.status === 401 || res.status === 403
          ? " Check TWITTER_BROKER_API_KEY and broker permissions."
          : "";
      throw new Error(
        `Twitter broker token request failed (${res.status}): ${bodyText}.${hint}`,
      );
    }

    const accessToken = body?.access_token;
    const expiresAtRaw = body?.expires_at;
    const expiresAt =
      typeof expiresAtRaw === "number"
        ? expiresAtRaw
        : typeof expiresAtRaw === "string"
          ? Number(expiresAtRaw)
          : NaN;

    if (!accessToken || typeof accessToken !== "string") {
      throw new Error(
        "Twitter broker response missing access_token. " +
          "Expected { access_token: string, expires_at: number }.",
      );
    }
    if (!Number.isFinite(expiresAt)) {
      throw new Error(
        "Twitter broker response missing expires_at. " +
          "Expected { access_token: string, expires_at: number }.",
      );
    }

    return accessToken;
  }
}

