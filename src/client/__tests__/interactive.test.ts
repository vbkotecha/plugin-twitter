import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { createInterfaceMock, getMockAnswer, setMockAnswer } = vi.hoisted(() => {
  let mockAnswer = "http://127.0.0.1/callback?code=abc&state=state-1";
  const createInterfaceMock = vi.fn(() => ({
    question: (_q: string, cb: (answer: string) => void) => cb(mockAnswer),
    close: vi.fn(),
  }));
  return {
    createInterfaceMock,
    getMockAnswer: () => mockAnswer,
    setMockAnswer: (next: string) => {
      mockAnswer = next;
    },
  };
});

vi.mock("node:readline", () => ({
  createInterface: createInterfaceMock,
}));

import { promptForRedirectedUrl, waitForLoopbackCallback } from "../auth-providers/interactive";
import { createServer } from "node:http";

async function getAvailablePort(): Promise<number> {
  const server = createServer();
  const port = await new Promise<number>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(typeof address === "string" ? 0 : address?.port ?? 0);
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  return port;
}

describe("interactive OAuth helpers", () => {
  const originalStdin = process.stdin.isTTY;
  const originalStdout = process.stdout.isTTY;

  beforeEach(() => {
    setMockAnswer("http://127.0.0.1/callback?code=abc&state=state-1");
    createInterfaceMock.mockClear();
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      configurable: true,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: originalStdin,
      configurable: true,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      value: originalStdout,
      configurable: true,
    });
  });

  it("promptForRedirectedUrl throws when not in TTY", async () => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: false,
      configurable: true,
    });
    await expect(promptForRedirectedUrl("Paste URL: ")).rejects.toThrow(
      "Twitter OAuth requires interactive setup",
    );
  });

  it("promptForRedirectedUrl returns trimmed answer", async () => {
    setMockAnswer("   https://example.com/callback?code=abc   ");
    const url = await promptForRedirectedUrl("Paste URL: ");
    expect(url).toBe("https://example.com/callback?code=abc");
    expect(createInterfaceMock).toHaveBeenCalled();
  });

  it("waitForLoopbackCallback rejects non-loopback redirect URIs", async () => {
    await expect(
      waitForLoopbackCallback("https://example.com/callback", "state"),
    ).rejects.toThrow("Redirect URI must be loopback");
  });

  it("waitForLoopbackCallback resolves with code and state", async () => {
    const port = await getAvailablePort();
    const state = "state-123";
    const promise = waitForLoopbackCallback(
      `http://127.0.0.1:${port}/callback`,
      state,
      2000,
    );

    await fetch(
      `http://127.0.0.1:${port}/callback?code=code-1&state=${state}`,
    );

    await expect(promise).resolves.toEqual({ code: "code-1", state });
  });

  it("waitForLoopbackCallback rejects on state mismatch", async () => {
    const port = await getAvailablePort();
    const promise = waitForLoopbackCallback(
      `http://127.0.0.1:${port}/callback`,
      "expected",
      2000,
    );

    const assertion = expect(promise).rejects.toThrow("OAuth state mismatch");
    await fetch(
      `http://127.0.0.1:${port}/callback?code=code-1&state=wrong`,
    );
    await assertion;
  });

  it("waitForLoopbackCallback rejects when code is missing", async () => {
    const port = await getAvailablePort();
    const promise = waitForLoopbackCallback(
      `http://127.0.0.1:${port}/callback`,
      "state",
      2000,
    );

    const assertion = expect(promise).rejects.toThrow("Missing code");
    await fetch(`http://127.0.0.1:${port}/callback?state=state`);
    await assertion;
  });

  it("waitForLoopbackCallback rejects on OAuth error", async () => {
    const port = await getAvailablePort();
    const promise = waitForLoopbackCallback(
      `http://127.0.0.1:${port}/callback`,
      "state",
      2000,
    );

    const assertion = expect(promise).rejects.toThrow(
      "OAuth error: access_denied - Nope",
    );
    await fetch(
      `http://127.0.0.1:${port}/callback?error=access_denied&error_description=Nope`,
    );
    await assertion;
  });

  it("waitForLoopbackCallback times out without callback", async () => {
    const port = await getAvailablePort();
    const promise = waitForLoopbackCallback(
      `http://127.0.0.1:${port}/callback`,
      "state",
      10,
    );
    const assertion = expect(promise).rejects.toThrow(
      "Timed out waiting for Twitter OAuth callback",
    );
    void fetch(`http://127.0.0.1:${port}/wrong-path`).catch(() => {});
    await assertion;
  });

  it("waitForLoopbackCallback rejects on server error", async () => {
    const port = await getAvailablePort();
    const blocker = createServer();
    await new Promise<void>((resolve) => {
      blocker.listen(port, "127.0.0.1", () => resolve());
    });

    await expect(
      waitForLoopbackCallback(
        `http://127.0.0.1:${port}/callback`,
        "state",
        2000,
      ),
    ).rejects.toThrow("OAuth callback server error");

    await new Promise<void>((resolve, reject) => {
      blocker.close((err) => (err ? reject(err) : resolve()));
    });
  });
});
