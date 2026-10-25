/** KYC routes: /me, submissions, admin queue + decisions. Tags: kyc, admin. */
import type { FastifyInstance } from "fastify";
import { requireAdmin, requireAuth } from "../auth/guards.js";
import type { KycService } from "../services/kycService.js";

export function registerKycRoutes(app: FastifyInstance, svc: KycService): void {
  app.get(
    "/me",
    {
      preHandler: [requireAuth],
      schema: { tags: ["kyc"] },
    },
    async (req, reply) => {
      const me = await svc.me(req.session!.sub);
      if (!me)
        return reply
          .code(404)
          .send({ error: "user_not_found", message: unknownUser(req.session!.sub) });
      return reply.send(me);
    },
  );

  app.post(
    "/me/kyc/submissions",
    {
      preHandler: [requireAuth],
      schema: {
        tags: ["kyc"],
        body: {
          type: "object",
          required: ["requestedTier", "evidence"],
          additionalProperties: false,
          properties: {
            requestedTier: { type: "string", enum: ["T1", "T2", "T3"] },
            evidence: {
              type: "object",
              additionalProperties: false,
              properties: {
                idDocumentRef: { type: "string", minLength: 1 },
                addressProofRef: { type: "string", minLength: 1 },
                titleDocRef: { type: "string", minLength: 1 },
                payoutName: { type: "string", minLength: 2 },
              },
            },
            expectedPayoutName: { type: "string" },
          },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as {
        requestedTier: "T1" | "T2" | "T3";
        evidence: unknown;
        expectedPayoutName?: string;
      };
      const out = await svc.submit(req.session!.sub, body);
      return reply.code(202).send(out);
    },
  );

  app.get(
    "/admin/kyc/queue",
    { preHandler: [requireAdmin], schema: { tags: ["admin"] } },
    async (_req, reply) => reply.send({ queue: await svc.queue() }),
  );

  app.post(
    "/admin/kyc/:userId/decision",
    {
      preHandler: [requireAdmin],
      schema: {
        tags: ["admin"],
        params: {
          type: "object",
          required: ["userId"],
          properties: { userId: { type: "string" } },
        },
        body: {
          type: "object",
          required: ["approve", "reason"],
          additionalProperties: false,
          properties: {
            approve: { type: "boolean" },
            reason: { type: "string", minLength: 3 },
          },
        },
      },
    },
    async (req, reply) => {
      const { userId } = req.params as { userId: string };
      const body = req.body as { approve: boolean; reason: string };
      const out = await svc.decide(req.session!.sub, userId, body);
      return reply.send(out);
    },
  );
}

const unknownUser = (id: string): string => `user ${id} unknown`;
