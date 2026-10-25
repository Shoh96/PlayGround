import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("GET /health", () => {
  it("reports ok when all dependencies are fine", async () => {
    const app = await createApp({
      dependencies: [{ name: "postgres", ok: true, detail: "up" }],
    });
    const res = await app.inject({ method: "GET", url: "/health" });
    const body = JSON.parse(res.body) as { status: string; service: string };
    expect(res.statusCode).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.service).toBe("api");
    await app.close();
  });

  it("reports degraded without failing the request", async () => {
    const app = await createApp({
      dependencies: [
        { name: "postgres", ok: true, detail: "up" },
        { name: "redis", ok: false, detail: "REDIS_URL unset" },
      ],
    });
    const res = await app.inject({ method: "GET", url: "/health" });
    const body = JSON.parse(res.body) as { status: string; dependencies: { name: string }[] };
    expect(res.statusCode).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.dependencies).toHaveLength(2);
    await app.close();
  });
});
