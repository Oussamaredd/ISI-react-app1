import {
  billingRuns,
  billingSourceAllocations,
  invoiceLineItems,
  invoices,
} from 'ecotrack-database';
import { describe, expect, it } from 'vitest';

import type { BillingPreview } from '../modules/billing/billing.contracts.js';
import { BillingRepository } from '../modules/billing/billing.repository.js';

type BillingState = {
  runs: Array<Record<string, unknown>>;
  invoices: Array<Record<string, unknown>>;
  lineItems: Array<Record<string, unknown>>;
  allocations: Array<Record<string, unknown>>;
};

const createPreview = (): BillingPreview => ({
  billingAccount: {
    id: 'billing-account-1',
    name: 'Zone Nord',
    scopeType: 'zone',
    scopeKey: 'zone-north',
    currency: 'EUR',
  },
  periodStart: '2026-03-01T00:00:00.000Z',
  periodEnd: '2026-04-01T00:00:00.000Z',
  subtotalCents: 1500,
  penaltyTotalCents: 400,
  totalCents: 1900,
  lineItems: [
    {
      rateRuleId: 'rate-rule-1',
      chargeType: 'collection_base',
      sourceType: 'collection_event',
      description: 'Completed collections',
      unit: 'event',
      unitPriceCents: 500,
      quantity: 3,
      lineTotalCents: 1500,
      isPenalty: false,
      sourceAllocations: [
        {
          sourceId: 'collection-1',
          quantity: 1,
          amountCents: 500,
          metadata: {},
        },
        {
          sourceId: 'collection-2',
          quantity: 1,
          amountCents: 500,
          metadata: {},
        },
        {
          sourceId: 'collection-3',
          quantity: 1,
          amountCents: 500,
          metadata: {},
        },
      ],
    },
    {
      rateRuleId: 'rate-rule-2',
      chargeType: 'overflow_penalty',
      sourceType: 'alert_event',
      description: 'Overflow penalty',
      unit: 'event',
      unitPriceCents: 200,
      quantity: 2,
      lineTotalCents: 400,
      isPenalty: true,
      sourceAllocations: [
        {
          sourceId: 'alert-1',
          quantity: 1,
          amountCents: 200,
          metadata: {},
        },
        {
          sourceId: 'alert-2',
          quantity: 1,
          amountCents: 200,
          metadata: {},
        },
      ],
    },
  ],
});

const createDbMock = (state: BillingState) => ({
  transaction: async <T>(callback: (tx: ReturnType<typeof createTransactionClient>) => Promise<T>) => {
    const draftState = structuredClone(state);
    const tx = createTransactionClient(draftState);
    const result = await callback(tx);
    state.runs = draftState.runs;
    state.invoices = draftState.invoices;
    state.lineItems = draftState.lineItems;
    state.allocations = draftState.allocations;
    return result;
  },
});

const createTransactionClient = (state: BillingState) => ({
  select: () => ({
    from: (table: unknown) => {
      if (table === billingRuns) {
        return {
          where: () => ({
            limit: async () => state.runs.map((run) => ({ id: run.id as string })).slice(0, 1),
          }),
        };
      }

      if (table === invoices) {
        return {
          where: () => ({
            limit: async () =>
              state.invoices
                .map((invoice) => ({
                  id: invoice.id as string,
                  billingRunId: invoice.billingRunId as string,
                  billingAccountId: invoice.billingAccountId as string,
                  invoiceNumber: invoice.invoiceNumber as string,
                  status: invoice.status as string,
                  billToName: invoice.billToName as string,
                  currency: invoice.currency as string,
                  periodStart: invoice.periodStart as Date,
                  periodEnd: invoice.periodEnd as Date,
                  subtotalCents: invoice.subtotalCents as number,
                  penaltyTotalCents: invoice.penaltyTotalCents as number,
                  totalCents: invoice.totalCents as number,
                  issuedAt: invoice.issuedAt as Date,
                  createdAt: invoice.createdAt as Date,
                }))
                .slice(0, 1),
          }),
        };
      }

      if (table === invoiceLineItems) {
        return {
          where: () => ({
            orderBy: async () =>
              state.lineItems.map((lineItem) => ({
                id: lineItem.id as string,
                chargeType: lineItem.chargeType as string,
                description: lineItem.description as string,
                quantity: lineItem.quantity as number,
                unit: lineItem.unit as string,
                unitPriceCents: lineItem.unitPriceCents as number,
                lineTotalCents: lineItem.lineTotalCents as number,
                metadata: lineItem.metadata as Record<string, unknown>,
                createdAt: lineItem.createdAt as Date,
              })),
          }),
        };
      }

      throw new Error('Unexpected select table in billing repository test.');
    },
  }),
  insert: (table: unknown) => ({
    values: (rawValues: Record<string, unknown> | Array<Record<string, unknown>>) => ({
      returning: async () => {
        const values = Array.isArray(rawValues) ? rawValues : [rawValues];

        if (table === billingRuns) {
          const createdAt = new Date('2026-03-20T10:00:00.000Z');
          const run = {
            id: `run-${state.runs.length + 1}`,
            createdAt,
            updatedAt: createdAt,
            finalizedAt: null,
            ...values[0],
          };
          state.runs.push(run);
          return [{ id: run.id }];
        }

        if (table === invoices) {
          const createdAt = new Date('2026-03-20T10:05:00.000Z');
          const invoice: Record<string, unknown> = {
            id: `invoice-${state.invoices.length + 1}`,
            status: 'issued',
            issuedAt: createdAt,
            createdAt,
            ...values[0],
          };
          state.invoices.push(invoice);
          return [
            {
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              billingRunId: invoice.billingRunId,
            },
          ];
        }

        if (table === invoiceLineItems) {
          const createdAt = new Date('2026-03-20T10:10:00.000Z');
          const lineItem: Record<string, unknown> = {
            id: `line-item-${state.lineItems.length + 1}`,
            createdAt,
            ...values[0],
          };
          state.lineItems.push(lineItem);
          return [
            {
              id: lineItem.id,
              chargeType: lineItem.chargeType,
            },
          ];
        }

        if (table === billingSourceAllocations) {
          const created = values.map((value, index) => {
            const allocation = {
              id: `allocation-${state.allocations.length + index + 1}`,
              createdAt: new Date('2026-03-20T10:15:00.000Z'),
              ...value,
            };
            state.allocations.push(allocation);
            return { id: allocation.id };
          });

          return created;
        }

        throw new Error('Unexpected insert table in billing repository test.');
      },
    }),
  }),
  update: (table: unknown) => ({
    set: (values: Record<string, unknown>) => ({
      where: async () => {
        if (table === billingRuns && state.runs.length > 0) {
          Object.assign(state.runs[0], values);
        }
      },
    }),
  }),
});

describe('BillingRepository', () => {
  it('finalizes a billing preview and persists the invoice graph atomically', async () => {
    const state: BillingState = {
      runs: [],
      invoices: [],
      lineItems: [],
      allocations: [],
    };
    const repository = new BillingRepository(createDbMock(state) as any);

    const result = await repository.finalizePreview(createPreview(), 'actor-1');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'invoice-1',
        billingRunId: 'run-1',
        billingAccountId: 'billing-account-1',
        billToName: 'Zone Nord',
        totalCents: 1900,
        lineItems: expect.arrayContaining([
          expect.objectContaining({
            chargeType: 'collection_base',
            lineTotalCents: 1500,
          }),
          expect.objectContaining({
            chargeType: 'overflow_penalty',
            lineTotalCents: 400,
          }),
        ]),
      }),
    );
    expect(state.runs).toHaveLength(1);
    expect(state.invoices).toHaveLength(1);
    expect(state.lineItems).toHaveLength(2);
    expect(state.allocations).toHaveLength(5);
    expect(state.runs[0]?.status).toBe('finalized');
  });

  it('rolls back all persisted billing state when finalization fails after line items', async () => {
    const state: BillingState = {
      runs: [],
      invoices: [],
      lineItems: [],
      allocations: [],
    };
    const repository = new BillingRepository(createDbMock(state) as any);

    await expect(
      repository.finalizePreview(createPreview(), 'actor-1', {
        simulateFailureStage: 'after_invoice_line_items',
      }),
    ).rejects.toThrow('Simulated billing transaction failure after invoice line items.');

    expect(state.runs).toEqual([]);
    expect(state.invoices).toEqual([]);
    expect(state.lineItems).toEqual([]);
    expect(state.allocations).toEqual([]);
  });
});
