import { createServer } from "node:http";

const port = Number(process.env.MOCK_BROKER_PORT ?? process.env.PORT ?? 8787);
const apiKey = process.env.MOCK_BROKER_API_KEY ?? "dev-key";
const accessToken = process.env.MOCK_BROKER_TOKEN ?? "mock-access-token";
const expiresIn = Number(process.env.MOCK_BROKER_EXPIRES_IN ?? 3600);

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/healthz") {
    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === "GET" && req.url === "/v1/twitter/access-token") {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${apiKey}`) {
      res.statusCode = 401;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        access_token: accessToken,
        expires_at: Date.now() + expiresIn * 1000,
      }),
    );
    return;
  }

  res.statusCode = 404;
  res.end();
});

server.listen(port, () => {
  console.log(`[mock-broker] listening on http://127.0.0.1:${port}`);
  console.log(`[mock-broker] TWITTER_BROKER_URL=http://127.0.0.1:${port}`);
  console.log(`[mock-broker] TWITTER_BROKER_API_KEY=${apiKey}`);
});
