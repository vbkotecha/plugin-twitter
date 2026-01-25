import { createServer } from "node:http";

export interface MockBrokerOptions {
  expectedApiKey?: string;
  accessToken?: string;
  expiresAt?: number;
  responseStatus?: number;
  responseBody?: Record<string, any>;
  errorStatus?: number;
  errorBody?: Record<string, any>;
}

export interface MockBrokerServer {
  baseUrl: string;
  close: () => Promise<void>;
  getLastAuthHeader: () => string | undefined;
}

export async function startMockBrokerServer(
  options: MockBrokerOptions = {},
): Promise<MockBrokerServer> {
  const expectedApiKey = options.expectedApiKey ?? "test-api-key";
  const accessToken = options.accessToken ?? "broker-token";
  const expiresAt = options.expiresAt ?? Date.now() + 60_000;
  const responseStatus = options.responseStatus ?? 200;
  const responseBody = options.responseBody ?? {
    access_token: accessToken,
    expires_at: expiresAt,
  };
  const errorStatus = options.errorStatus ?? 401;
  const errorBody = options.errorBody ?? { error: "unauthorized" };

  let lastAuthHeader: string | undefined;

  const server = createServer((req, res) => {
    if (req.method === "GET" && req.url === "/v1/twitter/access-token") {
      lastAuthHeader = req.headers.authorization;
      if (req.headers.authorization !== `Bearer ${expectedApiKey}`) {
        res.statusCode = errorStatus;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(errorBody));
        return;
      }

      res.statusCode = responseStatus;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(responseBody));
      return;
    }

    res.statusCode = 404;
    res.end();
  });

  let baseUrl = "";
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address !== "string") {
        baseUrl = `http://127.0.0.1:${address.port}`;
      }
      resolve();
    });
  });

  return {
    baseUrl,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
    getLastAuthHeader: () => lastAuthHeader,
  };
}
