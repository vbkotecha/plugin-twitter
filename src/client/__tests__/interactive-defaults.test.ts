import { describe, it, expect, vi } from "vitest";

describe("interactive OAuth defaults", () => {
  it("defaults port/path and ignores duplicate callbacks", async () => {
    vi.resetModules();

    let requestHandler: any;
    const onHandlers = new Map<string, (...args: any[]) => void>();
    const closeHandlers: Array<() => void> = [];

    const listenSpy = vi.fn();
    const server = {
      listen: (port: number, host: string, cb: () => void) => {
        listenSpy(port, host, cb);
        cb();
      },
      close: () => {
        closeHandlers.forEach((fn) => fn());
      },
      on: (event: string, cb: (...args: any[]) => void) => {
        onHandlers.set(event, cb);
        if (event === "close") closeHandlers.push(cb);
      },
      once: (event: string, cb: (...args: any[]) => void) => {
        onHandlers.set(event, cb);
      },
    };

    vi.doMock("node:http", () => ({
      createServer: (handler: any) => {
        requestHandler = handler;
        return server;
      },
    }));

    const { waitForLoopbackCallback } = await import(
      "../auth-providers/interactive"
    );

    const promise = waitForLoopbackCallback("http://127.0.0.1", "state", 1000);

    const res = { writeHead: vi.fn(), end: vi.fn() };
    requestHandler({ url: "/?code=code-1&state=state" }, res);
    requestHandler({ url: "/?code=code-2&state=state" }, res);

    const result = await promise;
    expect(result).toEqual({ code: "code-1", state: "state" });
    expect(listenSpy).toHaveBeenCalledWith(8080, "127.0.0.1", expect.any(Function));
  });
});
