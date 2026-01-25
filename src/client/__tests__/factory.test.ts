import { describe, it, expect, vi } from "vitest";
import {
  createTwitterAuthProvider,
  getTwitterAuthMode,
} from "../auth-providers/factory";
import { EnvAuthProvider } from "../auth-providers/env";
import { OAuth2PKCEAuthProvider } from "../auth-providers/oauth2-pkce";
import { BrokerAuthProvider } from "../auth-providers/broker";

describe("auth provider factory", () => {
  it("normalizes auth mode from runtime", () => {
    const runtime: any = {
      getSetting: vi.fn(() => "oauth"),
    };

    expect(getTwitterAuthMode(runtime)).toBe("oauth");
  });

  it("defaults to env when auth mode is missing", () => {
    const runtime: any = {
      getSetting: vi.fn(() => undefined),
    };

    expect(getTwitterAuthMode(runtime)).toBe("env");
  });

  it("handles null mode values", () => {
    const runtime: any = {
      getSetting: vi.fn(() => null),
    };

    expect(getTwitterAuthMode(runtime)).toBe("env");
  });

  it("defaults to env when runtime is undefined", () => {
    expect(getTwitterAuthMode(undefined)).toBe("env");
  });

  it("uses state override for auth mode", () => {
    const runtime: any = {
      getSetting: vi.fn(() => "env"),
    };

    expect(getTwitterAuthMode(runtime, { TWITTER_AUTH_MODE: "broker" })).toBe(
      "broker",
    );
  });

  it("throws on invalid auth mode", () => {
    const runtime: any = {
      getSetting: vi.fn(() => "bad"),
    };

    expect(() => getTwitterAuthMode(runtime)).toThrow(
      "Invalid TWITTER_AUTH_MODE",
    );
  });

  it("creates env provider", () => {
    const runtime: any = {
      getSetting: vi.fn(() => "env"),
    };
    const provider = createTwitterAuthProvider(runtime);
    expect(provider).toBeInstanceOf(EnvAuthProvider);
  });

  it("creates oauth provider", () => {
    const runtime: any = {
      getSetting: vi.fn(() => "oauth"),
    };
    const provider = createTwitterAuthProvider(runtime);
    expect(provider).toBeInstanceOf(OAuth2PKCEAuthProvider);
  });

  it("creates broker provider", () => {
    const runtime: any = {
      getSetting: vi.fn(() => "broker"),
    };
    const provider = createTwitterAuthProvider(runtime);
    expect(provider).toBeInstanceOf(BrokerAuthProvider);
  });
});
