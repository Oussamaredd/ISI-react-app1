import { randomUUID } from 'node:crypto';

import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, gte, isNull, lt, or } from 'drizzle-orm';
import {
  alertEvents,
  billingAccounts,
  billingRateRules,
  billingRuns,
  billingSourceAllocations,
  collectionEvents,
  containers,
  invoiceLineItems,
  invoices,
  type DatabaseClient,
} from 'ecotrack-database';

import { DRIZZLE } from '../../database/database.constants.js';

import type {
  BillingFinalizeOptions,
  BillingLineItemPreview,
  BillingPreview,
  BillingRateRuleRecord,
  BillingScopeType,
  BillingSourceAllocationPreview,
} from './billing.contracts.js';

type BillingAccountRecord = {
  id: string;
  name: string;
  scopeType: BillingScopeType;
  scopeKey: string;
  currency: string;
  isActive: boolean;
};

type TransactionClient = Parameters<DatabaseClient['transaction']>[0] extends (
  arg: infer T,
) => unknown
  ? T
  : never;

const normalizeCurrency = (value: string | null | undefined) =>
  (value?.trim().toUpperCase() || 'EUR').slice(0, 3);

const buildInvoiceNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  return `INV-${date}-${suffix}`;
};

const normalizeLineItemMetadata = (metadata: Record<string, unknown>) => metadata;

@Injectable()
export class BillingRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async listAccounts() {
    return this.db.query.billingAccounts.findMany({
      orderBy: (table, helpers) => [helpers.asc(table.name)],
      with: {
        rateRules: {
          orderBy: (table, helpers) => [helpers.asc(table.chargeType)],
        },
      },
    });
  }

  async createAccount(payload: {
    name: string;
    scopeType: BillingScopeType;
    scopeKey: string;
    currency?: string;
  }) {
    const normalizedScopeKey = payload.scopeKey.trim();
    const existing = await this.db.query.billingAccounts.findFirst({
      where: and(
        eq(billingAccounts.scopeType, payload.scopeType),
        eq(billingAccounts.scopeKey, normalizedScopeKey),
      ),
    });

    if (existing) {
      throw new BadRequestException('A billing account already exists for this scope.');
    }

    const [created] = await this.db
      .insert(billingAccounts)
      .values({
        name: payload.name.trim(),
        scopeType: payload.scopeType,
        scopeKey: normalizedScopeKey,
        currency: normalizeCurrency(payload.currency),
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create billing account.');
    }

    return created;
  }

  async upsertRateRule(
    billingAccountId: string,
    payload: {
      chargeType: string;
      sourceType: BillingRateRuleRecord['sourceType'];
      unit: BillingRateRuleRecord['unit'];
      unitPriceCents: number;
      description: string;
      filters?: Record<string, unknown>;
      isPenalty?: boolean;
      isActive?: boolean;
    },
  ) {
    await this.requireBillingAccount(billingAccountId);

    const existing = await this.db.query.billingRateRules.findFirst({
      where: and(
        eq(billingRateRules.billingAccountId, billingAccountId),
        eq(billingRateRules.chargeType, payload.chargeType.trim()),
      ),
    });

    if (existing) {
      const [updated] = await this.db
        .update(billingRateRules)
        .set({
          sourceType: payload.sourceType,
          unit: payload.unit,
          unitPriceCents: payload.unitPriceCents,
          description: payload.description.trim(),
          filters: payload.filters ?? {},
          isPenalty: payload.isPenalty ?? existing.isPenalty,
          isActive: payload.isActive ?? existing.isActive,
          updatedAt: new Date(),
        })
        .where(eq(billingRateRules.id, existing.id))
        .returning();

      if (!updated) {
        throw new Error('Failed to update billing rate rule.');
      }

      return updated;
    }

    const [created] = await this.db
      .insert(billingRateRules)
      .values({
        billingAccountId,
        chargeType: payload.chargeType.trim(),
        sourceType: payload.sourceType,
        unit: payload.unit,
        unitPriceCents: payload.unitPriceCents,
        description: payload.description.trim(),
        filters: payload.filters ?? {},
        isPenalty: payload.isPenalty ?? false,
        isActive: payload.isActive ?? true,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create billing rate rule.');
    }

    return created;
  }

  async getPreview(request: { billingAccountId: string; periodStart: Date; periodEnd: Date }): Promise<BillingPreview> {
    const account = await this.requireBillingAccount(request.billingAccountId);
    const rateRules = await this.getActiveRateRules(account.id);
    const lineItems: BillingLineItemPreview[] = [];

    for (const rateRule of rateRules) {
      const sourceAllocations = await this.listBillableSources(account, rateRule, request.periodStart, request.periodEnd);
      if (sourceAllocations.length === 0) {
        continue;
      }

      const quantity = sourceAllocations.reduce((total, item) => total + item.quantity, 0);
      const lineTotalCents = sourceAllocations.reduce((total, item) => total + item.amountCents, 0);

      lineItems.push({
        rateRuleId: rateRule.id,
        chargeType: rateRule.chargeType,
        sourceType: rateRule.sourceType,
        description: rateRule.description,
        unit: rateRule.unit,
        unitPriceCents: rateRule.unitPriceCents,
        quantity,
        lineTotalCents,
        isPenalty: rateRule.isPenalty,
        sourceAllocations,
      });
    }

    const subtotalCents = lineItems
      .filter((item) => !item.isPenalty)
      .reduce((total, item) => total + item.lineTotalCents, 0);
    const penaltyTotalCents = lineItems
      .filter((item) => item.isPenalty)
      .reduce((total, item) => total + item.lineTotalCents, 0);

    return {
      billingAccount: {
        id: account.id,
        name: account.name,
        scopeType: account.scopeType,
        scopeKey: account.scopeKey,
        currency: account.currency,
      },
      periodStart: request.periodStart.toISOString(),
      periodEnd: request.periodEnd.toISOString(),
      subtotalCents,
      penaltyTotalCents,
      totalCents: subtotalCents + penaltyTotalCents,
      lineItems,
    };
  }

  async finalizePreview(
    preview: BillingPreview,
    actorUserId: string,
    options?: BillingFinalizeOptions,
  ) {
    return this.db.transaction(async (tx) => {
      const [existingRun] = await tx
        .select({ id: billingRuns.id })
        .from(billingRuns)
        .where(
          and(
            eq(billingRuns.billingAccountId, preview.billingAccount.id),
            eq(billingRuns.periodStart, new Date(preview.periodStart)),
            eq(billingRuns.periodEnd, new Date(preview.periodEnd)),
          ),
        )
        .limit(1);

      if (existingRun) {
        throw new BadRequestException('A finalized billing run already exists for this account and period.');
      }

      const [createdRun] = await tx
        .insert(billingRuns)
        .values({
          billingAccountId: preview.billingAccount.id,
          periodStart: new Date(preview.periodStart),
          periodEnd: new Date(preview.periodEnd),
          currency: preview.billingAccount.currency,
          status: 'processing',
          subtotalCents: preview.subtotalCents,
          penaltyTotalCents: preview.penaltyTotalCents,
          totalCents: preview.totalCents,
          createdByUserId: actorUserId,
        })
        .returning({
          id: billingRuns.id,
        });

      if (!createdRun) {
        throw new Error('Failed to create billing run.');
      }

      const [createdInvoice] = await tx
        .insert(invoices)
        .values({
          billingRunId: createdRun.id,
          billingAccountId: preview.billingAccount.id,
          invoiceNumber: buildInvoiceNumber(),
          billToName: preview.billingAccount.name,
          currency: preview.billingAccount.currency,
          periodStart: new Date(preview.periodStart),
          periodEnd: new Date(preview.periodEnd),
          subtotalCents: preview.subtotalCents,
          penaltyTotalCents: preview.penaltyTotalCents,
          totalCents: preview.totalCents,
        })
        .returning({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          billingRunId: invoices.billingRunId,
        });

      if (!createdInvoice) {
        throw new Error('Failed to create invoice.');
      }

      const lineItemIds = new Map<string, string>();

      for (const lineItem of preview.lineItems) {
        const [createdLineItem] = await tx
          .insert(invoiceLineItems)
          .values({
            invoiceId: createdInvoice.id,
            billingRunId: createdRun.id,
            rateRuleId: lineItem.rateRuleId,
            chargeType: lineItem.chargeType,
            description: lineItem.description,
            quantity: lineItem.quantity,
            unit: lineItem.unit,
            unitPriceCents: lineItem.unitPriceCents,
            lineTotalCents: lineItem.lineTotalCents,
            metadata: {
              sourceCount: lineItem.sourceAllocations.length,
            },
          })
          .returning({
            id: invoiceLineItems.id,
            chargeType: invoiceLineItems.chargeType,
          });

        if (!createdLineItem) {
          throw new Error(`Failed to create invoice line item for ${lineItem.chargeType}.`);
        }

        lineItemIds.set(createdLineItem.chargeType, createdLineItem.id);
      }

      if (options?.simulateFailureStage === 'after_invoice_line_items') {
        throw new Error('Simulated billing transaction failure after invoice line items.');
      }

      for (const lineItem of preview.lineItems) {
        const lineItemId = lineItemIds.get(lineItem.chargeType);
        if (!lineItemId) {
          throw new Error(`Missing persisted line item for ${lineItem.chargeType}.`);
        }

        const insertedAllocations = await tx
          .insert(billingSourceAllocations)
          .values(
            lineItem.sourceAllocations.map((allocation) => ({
              billingRunId: createdRun.id,
              invoiceId: createdInvoice.id,
              lineItemId,
              billingAccountId: preview.billingAccount.id,
              rateRuleId: lineItem.rateRuleId,
              chargeType: lineItem.chargeType,
              sourceType: lineItem.sourceType,
              sourceId: allocation.sourceId,
              amountCents: allocation.amountCents,
            })),
          )
          .returning({
            id: billingSourceAllocations.id,
          });

        if (insertedAllocations.length !== lineItem.sourceAllocations.length) {
          throw new Error(`Billing source allocation mismatch for ${lineItem.chargeType}.`);
        }
      }

      await tx
        .update(billingRuns)
        .set({
          status: 'finalized',
          finalizedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(billingRuns.id, createdRun.id));

      return this.getInvoiceByIdWithClient(createdInvoice.id, tx);
    });
  }

  async listInvoices(filters: { billingAccountId?: string; limit: number }) {
    const baseConditions = [];
    if (filters.billingAccountId) {
      baseConditions.push(eq(invoices.billingAccountId, filters.billingAccountId));
    }

    const safeLimit = Math.max(1, Math.min(filters.limit, 100));
    const query = this.db
      .select({
        id: invoices.id,
        billingRunId: invoices.billingRunId,
        billingAccountId: invoices.billingAccountId,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        billToName: invoices.billToName,
        currency: invoices.currency,
        periodStart: invoices.periodStart,
        periodEnd: invoices.periodEnd,
        subtotalCents: invoices.subtotalCents,
        penaltyTotalCents: invoices.penaltyTotalCents,
        totalCents: invoices.totalCents,
        issuedAt: invoices.issuedAt,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .orderBy(desc(invoices.issuedAt))
      .limit(safeLimit);

    return baseConditions.length > 0 ? query.where(and(...baseConditions)) : query;
  }

  async getInvoiceById(invoiceId: string) {
    return this.getInvoiceByIdWithClient(invoiceId, this.db);
  }

  private async getInvoiceByIdWithClient(invoiceId: string, client: DatabaseClient | TransactionClient) {
    const [invoice] = await client
      .select({
        id: invoices.id,
        billingRunId: invoices.billingRunId,
        billingAccountId: invoices.billingAccountId,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        billToName: invoices.billToName,
        currency: invoices.currency,
        periodStart: invoices.periodStart,
        periodEnd: invoices.periodEnd,
        subtotalCents: invoices.subtotalCents,
        penaltyTotalCents: invoices.penaltyTotalCents,
        totalCents: invoices.totalCents,
        issuedAt: invoices.issuedAt,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }

    const lineItems = await client
      .select({
        id: invoiceLineItems.id,
        chargeType: invoiceLineItems.chargeType,
        description: invoiceLineItems.description,
        quantity: invoiceLineItems.quantity,
        unit: invoiceLineItems.unit,
        unitPriceCents: invoiceLineItems.unitPriceCents,
        lineTotalCents: invoiceLineItems.lineTotalCents,
        metadata: invoiceLineItems.metadata,
        createdAt: invoiceLineItems.createdAt,
      })
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, invoiceId))
      .orderBy(asc(invoiceLineItems.createdAt));

    return {
      ...invoice,
      lineItems,
    };
  }

  private async getActiveRateRules(billingAccountId: string): Promise<BillingRateRuleRecord[]> {
    const rules = await this.db.query.billingRateRules.findMany({
      where: and(
        eq(billingRateRules.billingAccountId, billingAccountId),
        eq(billingRateRules.isActive, true),
      ),
      orderBy: (table, helpers) => [helpers.asc(table.chargeType)],
    });

    return rules.map((rule) => ({
      id: rule.id,
      billingAccountId: rule.billingAccountId,
      chargeType: rule.chargeType,
      sourceType: rule.sourceType as BillingRateRuleRecord['sourceType'],
      unit: rule.unit as BillingRateRuleRecord['unit'],
      unitPriceCents: rule.unitPriceCents,
      description: rule.description,
      filters: (rule.filters as Record<string, unknown> | null) ?? {},
      isPenalty: rule.isPenalty,
      isActive: rule.isActive,
    }));
  }

  private async requireBillingAccount(billingAccountId: string): Promise<BillingAccountRecord> {
    const account = await this.db.query.billingAccounts.findFirst({
      where: eq(billingAccounts.id, billingAccountId),
    });

    if (!account) {
      throw new NotFoundException('Billing account not found.');
    }

    if (account.scopeType !== 'zone') {
      throw new BadRequestException('Only zone-scoped billing accounts are supported in this phase.');
    }

    if (!account.isActive) {
      throw new BadRequestException('Billing account is inactive.');
    }

    return {
      id: account.id,
      name: account.name,
      scopeType: account.scopeType as BillingScopeType,
      scopeKey: account.scopeKey,
      currency: normalizeCurrency(account.currency),
      isActive: account.isActive,
    };
  }

  private async listBillableSources(
    account: BillingAccountRecord,
    rateRule: BillingRateRuleRecord,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<BillingSourceAllocationPreview[]> {
    if (rateRule.sourceType === 'collection_event') {
      return this.listCollectionEventSources(account, rateRule, periodStart, periodEnd);
    }

    if (rateRule.sourceType === 'alert_event') {
      return this.listAlertEventSources(account, rateRule, periodStart, periodEnd);
    }

    return [];
  }

  private async listCollectionEventSources(
    account: BillingAccountRecord,
    rateRule: BillingRateRuleRecord,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<BillingSourceAllocationPreview[]> {
    const rows = await this.db
      .select({
        id: collectionEvents.id,
        containerId: collectionEvents.containerId,
        tourStopId: collectionEvents.tourStopId,
        volumeLiters: collectionEvents.volumeLiters,
        collectedAt: collectionEvents.collectedAt,
      })
      .from(collectionEvents)
      .innerJoin(containers, eq(collectionEvents.containerId, containers.id))
      .leftJoin(
        billingSourceAllocations,
        and(
          eq(billingSourceAllocations.billingAccountId, account.id),
          eq(billingSourceAllocations.chargeType, rateRule.chargeType),
          eq(billingSourceAllocations.sourceType, rateRule.sourceType),
          eq(billingSourceAllocations.sourceId, collectionEvents.id),
        ),
      )
      .where(
        and(
          eq(containers.zoneId, account.scopeKey),
          gte(collectionEvents.collectedAt, periodStart),
          lt(collectionEvents.collectedAt, periodEnd),
          isNull(billingSourceAllocations.id),
        ),
      )
      .orderBy(asc(collectionEvents.collectedAt));

    return rows
      .map((row) => {
        const rawVolumeLiters = Math.max(0, Number(row.volumeLiters ?? 0));
        const quantity = rateRule.unit === 'liter' ? rawVolumeLiters : 1;
        const amountCents = quantity * rateRule.unitPriceCents;

        return {
          sourceId: row.id,
          amountCents,
          quantity,
          metadata: normalizeLineItemMetadata({
            collectedAt: row.collectedAt.toISOString(),
            containerId: row.containerId,
            tourStopId: row.tourStopId,
            volumeLiters: rawVolumeLiters,
          }),
        };
      })
      .filter((row) => row.quantity > 0 && row.amountCents >= 0);
  }

  private async listAlertEventSources(
    account: BillingAccountRecord,
    rateRule: BillingRateRuleRecord,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<BillingSourceAllocationPreview[]> {
    if (rateRule.unit !== 'event') {
      throw new BadRequestException('Alert-event billing rules currently support only event-based pricing.');
    }

    const severityFilter =
      typeof rateRule.filters.severity === 'string' ? rateRule.filters.severity.trim() : undefined;
    const eventTypeFilter =
      typeof rateRule.filters.eventType === 'string' ? rateRule.filters.eventType.trim() : undefined;

    const conditions = [
      gte(alertEvents.triggeredAt, periodStart),
      lt(alertEvents.triggeredAt, periodEnd),
      or(
        eq(alertEvents.zoneId, account.scopeKey),
        and(isNull(alertEvents.zoneId), eq(containers.zoneId, account.scopeKey)),
      ),
      isNull(billingSourceAllocations.id),
    ];

    if (severityFilter) {
      conditions.push(eq(alertEvents.severity, severityFilter));
    }

    if (eventTypeFilter) {
      conditions.push(eq(alertEvents.eventType, eventTypeFilter));
    }

    const rows = await this.db
      .select({
        id: alertEvents.id,
        containerId: alertEvents.containerId,
        zoneId: alertEvents.zoneId,
        severity: alertEvents.severity,
        eventType: alertEvents.eventType,
        triggeredAt: alertEvents.triggeredAt,
      })
      .from(alertEvents)
      .leftJoin(containers, eq(alertEvents.containerId, containers.id))
      .leftJoin(
        billingSourceAllocations,
        and(
          eq(billingSourceAllocations.billingAccountId, account.id),
          eq(billingSourceAllocations.chargeType, rateRule.chargeType),
          eq(billingSourceAllocations.sourceType, rateRule.sourceType),
          eq(billingSourceAllocations.sourceId, alertEvents.id),
        ),
      )
      .where(and(...conditions))
      .orderBy(asc(alertEvents.triggeredAt));

    return rows.map((row) => ({
      sourceId: row.id,
      amountCents: rateRule.unitPriceCents,
      quantity: 1,
      metadata: normalizeLineItemMetadata({
        containerId: row.containerId,
        zoneId: row.zoneId,
        severity: row.severity,
        eventType: row.eventType,
        triggeredAt: row.triggeredAt.toISOString(),
      }),
    }));
  }
}
