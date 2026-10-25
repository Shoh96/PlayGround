import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3001);

const app = await createApp({
  dependencies: [
    { name: "postgres", ok: Boolean(process.env.DATABASE_URL), detail: "wired in Phase 3" },
    { name: "redis", ok: Boolean(process.env.REDIS_URL), detail: "wired in Phase 4" },
  ],
});

await app.listen({ port, host: "0.0.0.0" });
