import { describe, it, expect, vi } from "vitest";
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

describe("interactive OAuth error handling", () => {
  it("rejects when request handler throws", async () => {
    vi.resetModules();
    vi.doMock("node:url", async () => {
      const actual = await vi.importActual<typeof import("node:url")>("node:url");
      class ThrowingURL extends actual.URL {
        constructor(input: string | URL, base?: string | URL) {
          if (String(input).includes("trigger-throw")) {
            throw new Error("boom");
          }
          super(input, base);
        }
      }
      return { ...actual, URL: ThrowingURL };
    });

    const { waitForLoopbackCallback } = await import(
      "../auth-providers/interactive"
    );

    const port = await getAvailablePort();
    const promise = waitForLoopbackCallback(
      `http://127.0.0.1:${port}/callback`,
      "state",
      2000,
    );

    const assertion = expect(promise).rejects.toThrow("boom");
    void fetch(`http://127.0.0.1:${port}/callback?trigger-throw=1`).catch(() => {});
    await assertion;

    vi.doUnmock("node:url");
  });
});
