import { z } from 'zod'
import { createPlanSchema, createSubscriptionSchema } from './validation'

// Builds the OpenAPI 3.1 document for the merchant-facing REST API, reusing
// the same Zod schemas the routes validate against (via z.toJSONSchema, built
// into Zod v4) so the published spec can't drift from what the routes accept.
// OpenAPI 3.1 adopted JSON Schema 2020-12 directly, so the conversion needs no
// intermediate mapping — the JSON Schema output slots straight into `schema:`.

function toSchema(zodSchema: z.ZodType) {
  // io: 'input' documents the pre-transform shape (e.g. address as a plain
  // string) — z.toJSONSchema can't represent .transform()'d output types.
  return z.toJSONSchema(zodSchema, { target: 'draft-2020-12', io: 'input' })
}

export function buildOpenApiDocument() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Tidepay API',
      version: '1.0.0',
      description:
        'Recurring crypto subscription infrastructure with automatic payment splits. ' +
        'Create plans, subscribe wallets, and receive signed webhooks as subscriptions bill.',
    },
    servers: [{ url: '/api/v1', description: 'Merchant API' }],
    security: [{ apiKey: [] }],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'Your merchant API key, shown once at creation in the dashboard (Settings → API key).',
        },
      },
      schemas: {
        CreatePlanRequest: toSchema(createPlanSchema),
        CreateSubscriptionRequest: toSchema(createSubscriptionSchema),
      },
    },
    paths: {
      '/plans': {
        post: {
          summary: 'Create a plan',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePlanRequest' } } },
          },
          responses: {
            '201': { description: 'Plan created' },
            '400': { description: 'Invalid input' },
            '401': { description: 'Missing or invalid API key' },
          },
        },
        get: {
          summary: 'List plans',
          responses: { '200': { description: 'Plans for the authenticated merchant' } },
        },
      },
      '/plans/{planId}': {
        get: {
          summary: 'Get a plan',
          parameters: [{ name: 'planId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Plan' }, '404': { description: 'Not found' } },
        },
      },
      '/subscriptions': {
        post: {
          summary: 'Create a subscription',
          description:
            'Returns a subscribeUrl to redirect the subscriber to, where they connect their wallet and grant the ' +
            'ERC-20 allowance tidepay needs to run recurring pulls.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateSubscriptionRequest' } } },
          },
          responses: {
            '201': { description: 'Subscription created' },
            '400': { description: 'Invalid input' },
            '404': { description: 'Plan not found' },
          },
        },
      },
      '/subscriptions/{subscriptionId}': {
        get: {
          summary: 'Get subscription status',
          parameters: [{ name: 'subscriptionId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Subscription + last charge' }, '404': { description: 'Not found' } },
        },
        delete: {
          summary: 'Cancel a subscription',
          parameters: [{ name: 'subscriptionId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Canceled' }, '404': { description: 'Not found' } },
        },
      },
    },
    'x-webhooks': {
      description:
        'Tidepay sends signed webhooks to your configured webhookUrl for: subscription.created, ' +
        'subscription.active, subscription.canceled, payment.succeeded, payment.failed. ' +
        'Verify each request with HMAC-SHA256: signature = HMAC-SHA256(webhookSecret, `${timestamp}.${rawBody}`), ' +
        'sent as the X-Tidepay-Timestamp and X-Tidepay-Signature headers.',
      events: ['subscription.created', 'subscription.active', 'subscription.canceled', 'payment.succeeded', 'payment.failed'],
    },
  }
}
