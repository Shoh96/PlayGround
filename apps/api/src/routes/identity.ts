/** Auth routes: OTP request/verify. OpenAPI tags: auth. */
import type { FastifyInstance } from "fastify";
import type { IdentityService } from "../services/identityService.js";

const PhoneSchema = { type: "string", pattern: "^\\+[1-9]\\d{6,14}$" } as const;

export function registerIdentityRoutes(app: FastifyInstance, svc: IdentityService): void {
  app.post(
    "/auth/otp/request",
    {
      schema: {
        tags: ["auth"],
        body: {
          type: "object",
          required: ["phone"],
          additionalProperties: false,
          properties: { phone: PhoneSchema },
        },
      },
    },
    async (req, reply) => {
      const { phone } = req.body as { phone: string };
      return reply.send(await svc.requestOtp(phone));
    },
  );

  app.post(
    "/auth/otp/verify",
    {
      schema: {
        tags: ["auth"],
        body: {
          type: "object",
          required: ["phone", "requestId", "code"],
          additionalProperties: false,
          properties: {
            phone: PhoneSchema,
            requestId: { type: "string", minLength: 8 },
            code: { type: "string", pattern: "^\\d{6}$" },
            displayName: { type: "string", maxLength: 120 },
            roles: { type: "array", items: { type: "string" }, maxItems: 4 },
          },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as {
        phone: string;
        requestId: string;
        code: string;
        displayName?: string;
        roles?: string[];
      };
      const out = await svc.verifyOtpAndSignup(body);
      return reply.send(out);
    },
  );
}
