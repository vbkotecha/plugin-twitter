import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  FileTokenStore,
  RuntimeCacheTokenStore,
  chooseDefaultTokenStore,
} from "../auth-providers/token-store";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("token-store", () => {
  describe("FileTokenStore", () => {
    it("roundtrips save/load", async () => {
      const path = join(tmpdir(), `twitter-oauth2-tokens-${Date.now()}.json`);
      const store = new FileTokenStore(path);

      const tokens = {
        access_token: "access",
        refresh_token: "refresh",
        expires_at: Date.now() + 60_000,
        scope: "tweet.read",
        token_type: "bearer",
      };

      await store.save(tokens);
      const loaded = await store.load();
      expect(loaded).toEqual(tokens);

      await store.clear();
      const cleared = await store.load();
      expect(cleared).toBeNull();
    });

    it("returns null for corrupted json", async () => {
      const path = join(tmpdir(), `twitter-oauth2-tokens-${Date.now()}-bad.json`);
      await fs.writeFile(path, "{ not json", "utf-8");

      const store = new FileTokenStore(path);
      const loaded = await store.load();
      expect(loaded).toBeNull();

      await store.clear();
    });

    it("returns null when file is missing", async () => {
      const path = join(tmpdir(), `twitter-oauth2-tokens-${Date.now()}-missing.json`);
      const store = new FileTokenStore(path);
      const loaded = await store.load();
      expect(loaded).toBeNull();
      await store.clear();
    });

    it("returns null for invalid token shapes", async () => {
      const path = join(tmpdir(), `twitter-oauth2-tokens-${Date.now()}-invalid.json`);
      await fs.writeFile(path, JSON.stringify({ access_token: 123 }), "utf-8");
      const store = new FileTokenStore(path);
      const loaded = await store.load();
      expect(loaded).toBeNull();
      await store.clear();
    });

    it("returns null when parsed value is not an object", async () => {
      const path = join(tmpdir(), `twitter-oauth2-tokens-${Date.now()}-primitive.json`);
      await fs.writeFile(path, JSON.stringify("nope"), "utf-8");
      const store = new FileTokenStore(path);
      const loaded = await store.load();
      expect(loaded).toBeNull();
      await store.clear();
    });

    it("returns null when expires_at is invalid", async () => {
      const path = join(tmpdir(), `twitter-oauth2-tokens-${Date.now()}-expires.json`);
      await fs.writeFile(
        path,
        JSON.stringify({ access_token: "token", expires_at: "bad" }),
        "utf-8",
      );
      const store = new FileTokenStore(path);
      const loaded = await store.load();
      expect(loaded).toBeNull();
      await store.clear();
    });

    it("exposes a stable default path", () => {
      const defaultPath = FileTokenStore.defaultPath();
      expect(defaultPath).toContain(".eliza");
      expect(defaultPath).toContain("oauth2.tokens.json");
    });

    it("ignores chmod errors during save", async () => {
      const path = join(tmpdir(), `twitter-oauth2-tokens-${Date.now()}-chmod.json`);
      const store = new FileTokenStore(path);
      const chmodSpy = vi
        .spyOn(fs, "chmod")
        .mockRejectedValueOnce(new Error("chmod failed"));

      await store.save({
        access_token: "access",
        refresh_token: "refresh",
        expires_at: Date.now() + 60_000,
      });

      chmodSpy.mockRestore();
      await store.clear();
    });
  });

  describe("RuntimeCacheTokenStore", () => {
    let runtime: any;

    beforeEach(() => {
      const cache = new Map<string, any>();
      runtime = {
        agentId: "agent-123",
        getCache: vi.fn(async (k: string) => cache.get(k)),
        setCache: vi.fn(async (k: string, v: any) => {
          cache.set(k, v);
        }),
      };
    });

    it("saves and loads via runtime cache", async () => {
      const store = new RuntimeCacheTokenStore(runtime);
      const tokens = {
        access_token: "a",
        refresh_token: "r",
        expires_at: 123,
      };

      await store.save(tokens);
      const loaded = await store.load();
      expect(loaded).toEqual(tokens);
      expect(runtime.setCache).toHaveBeenCalled();
      expect(runtime.getCache).toHaveBeenCalled();
    });

    it("clear removes the cached value (via undefined)", async () => {
      const store = new RuntimeCacheTokenStore(runtime);
      await store.save({
        access_token: "a",
        refresh_token: "r",
        expires_at: 123,
      });

      await store.clear();
      const loaded = await store.load();
      expect(loaded).toBeNull();
      expect(runtime.setCache).toHaveBeenCalledWith(expect.any(String), undefined);
    });

    it("returns null when runtime cache throws", async () => {
      runtime.getCache = vi.fn(async () => {
        throw new Error("cache down");
      });

      const store = new RuntimeCacheTokenStore(runtime);
      const loaded = await store.load();
      expect(loaded).toBeNull();
    });
  });

  describe("chooseDefaultTokenStore", () => {
    it("uses runtime cache when available", () => {
      const runtime: any = {
        agentId: "agent-123",
        getCache: vi.fn(),
        setCache: vi.fn(),
      };
      const store = chooseDefaultTokenStore(runtime);
      expect(store).toBeInstanceOf(RuntimeCacheTokenStore);
    });

    it("falls back to file store when runtime cache is unavailable", () => {
      const runtime: any = {
        agentId: "agent-123",
      };
      const store = chooseDefaultTokenStore(runtime);
      expect(store).toBeInstanceOf(FileTokenStore);
    });
  });
});

