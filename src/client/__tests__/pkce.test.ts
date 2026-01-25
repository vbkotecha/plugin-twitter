import { describe, it, expect } from "vitest";
import {
  createCodeChallenge,
  base64UrlEncode,
  createCodeVerifier,
  createState,
} from "../auth-providers/pkce";

describe("pkce helpers", () => {
  it("base64UrlEncode should be url-safe and unpadded", () => {
    const out = base64UrlEncode(Buffer.from("hello world"));
    expect(out).not.toContain("+");
    expect(out).not.toContain("/");
    expect(out).not.toContain("=");
  });

  it("createCodeChallenge should match known vector", () => {
    // RFC 7636 example (verifier => challenge)
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const expected = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
    expect(createCodeChallenge(verifier)).toBe(expected);
  });

  it("createCodeVerifier produces url-safe value", () => {
    const verifier = createCodeVerifier(32);
    expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/);
    expect(verifier.length).toBeGreaterThanOrEqual(43);
  });

  it("createState produces url-safe value", () => {
    const state = createState(16);
    expect(state).toMatch(/^[A-Za-z0-9\-_]+$/);
    expect(state.length).toBeGreaterThan(0);
  });
});

