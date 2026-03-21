import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BillingService } from '../modules/billing/billing.service.js';

describe('BillingService', () => {
  const repositoryMock = {
    listAccounts: vi.fn(),
    createAccount: vi.fn(),
    upsertRateRule: vi.fn(),
    getPreview: vi.fn(),
    finalizePreview: vi.fn(),
    listInvoices: vi.fn(),
    getInvoiceById: vi.fn(),
  };

  let service: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BillingService(repositoryMock as any);
  });

  it('delegates account and invoice operations to the repository', async () => {
    repositoryMock.listAccounts.mockResolvedValueOnce([{ id: 'account-1' }]);
    repositoryMock.createAccount.mockResolvedValueOnce({ id: 'account-1' });
    repositoryMock.listInvoices.mockResolvedValueOnce([{ id: 'invoice-1' }]);
    repositoryMock.getInvoiceById.mockResolvedValueOnce({ id: 'invoice-1' });

    await expect(service.listAccounts()).resolves.toEqual([{ id: 'account-1' }]);
    await expect(
      service.createAccount({
        name: 'Zone Nord',
        scopeType: 'zone',
        scopeKey: 'zone-north',
        currency: 'EUR',
      } as any),
    ).resolves.toEqual({ id: 'account-1' });
    await expect(service.listInvoices({ billingAccountId: 'account-1', limit: 10 })).resolves.toEqual([
      { id: 'invoice-1' },
    ]);
    await expect(service.getInvoiceById('invoice-1')).resolves.toEqual({ id: 'invoice-1' });

    expect(repositoryMock.createAccount).toHaveBeenCalledWith({
      name: 'Zone Nord',
      scopeType: 'zone',
      scopeKey: 'zone-north',
      currency: 'EUR',
    });
    expect(repositoryMock.listInvoices).toHaveBeenCalledWith({ billingAccountId: 'account-1', limit: 10 });
    expect(repositoryMock.getInvoiceById).toHaveBeenCalledWith('invoice-1');
  });

  it('validates alert-event billing rules before delegating', async () => {
    await expect(
      service.upsertRateRule('account-1', {
        chargeType: 'overflow_penalty',
        sourceType: 'alert_event',
        unit: 'liter',
        unitPriceCents: 200,
        description: 'Overflow',
        filters: {},
        isPenalty: true,
        isActive: true,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    repositoryMock.upsertRateRule.mockResolvedValueOnce({ id: 'rule-1' });

    await expect(
      service.upsertRateRule('account-1', {
        chargeType: 'overflow_penalty',
        sourceType: 'alert_event',
        unit: 'event',
        unitPriceCents: 200,
        description: 'Overflow',
        filters: { severity: 'critical' },
        isPenalty: true,
        isActive: true,
      } as any),
    ).resolves.toEqual({ id: 'rule-1' });

    expect(repositoryMock.upsertRateRule).toHaveBeenCalledWith('account-1', {
      chargeType: 'overflow_penalty',
      sourceType: 'alert_event',
      unit: 'event',
      unitPriceCents: 200,
      description: 'Overflow',
      filters: { severity: 'critical' },
      isPenalty: true,
      isActive: true,
    });
  });

  it('normalizes billing run dates before previewing', async () => {
    repositoryMock.getPreview.mockResolvedValueOnce({ id: 'preview-1' });

    await expect(
      service.previewRun({
        billingAccountId: '11111111-1111-4111-8111-111111111111',
        periodStart: '2026-03-01T00:00:00.000Z',
        periodEnd: '2026-04-01T00:00:00.000Z',
      } as any),
    ).resolves.toEqual({ id: 'preview-1' });

    expect(repositoryMock.getPreview).toHaveBeenCalledWith({
      billingAccountId: '11111111-1111-4111-8111-111111111111',
      periodStart: new Date('2026-03-01T00:00:00.000Z'),
      periodEnd: new Date('2026-04-01T00:00:00.000Z'),
    });
  });

  it('rejects invalid billing run windows', async () => {
    await expect(
      service.previewRun({
        billingAccountId: '11111111-1111-4111-8111-111111111111',
        periodStart: 'not-a-date',
        periodEnd: '2026-04-01T00:00:00.000Z',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.previewRun({
        billingAccountId: '11111111-1111-4111-8111-111111111111',
        periodStart: '2026-04-01T00:00:00.000Z',
        periodEnd: '2026-03-01T00:00:00.000Z',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects empty previews during finalization and persists valid previews', async () => {
    repositoryMock.getPreview.mockResolvedValueOnce({
      lineItems: [],
    });

    await expect(
      service.finalizeRun(
        {
          billingAccountId: '11111111-1111-4111-8111-111111111111',
          periodStart: '2026-03-01T00:00:00.000Z',
          periodEnd: '2026-04-01T00:00:00.000Z',
        } as any,
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repositoryMock.finalizePreview).not.toHaveBeenCalled();

    const preview = {
      lineItems: [
        {
          chargeType: 'collection_base',
        },
      ],
    };
    repositoryMock.getPreview.mockResolvedValueOnce(preview);
    repositoryMock.finalizePreview.mockResolvedValueOnce({ id: 'invoice-1' });

    await expect(
      service.finalizeRun(
        {
          billingAccountId: '11111111-1111-4111-8111-111111111111',
          periodStart: '2026-03-01T00:00:00.000Z',
          periodEnd: '2026-04-01T00:00:00.000Z',
        } as any,
        'user-1',
        { simulateFailureStage: 'after_invoice_line_items' },
      ),
    ).resolves.toEqual({ id: 'invoice-1' });

    expect(repositoryMock.finalizePreview).toHaveBeenCalledWith(preview, 'user-1', {
      simulateFailureStage: 'after_invoice_line_items',
    });
  });
});
