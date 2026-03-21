import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BillingController } from '../modules/billing/billing.controller.js';

describe('BillingController', () => {
  const billingServiceMock = {
    listAccounts: vi.fn(),
    createAccount: vi.fn(),
    upsertRateRule: vi.fn(),
    previewRun: vi.fn(),
    finalizeRun: vi.fn(),
    listInvoices: vi.fn(),
    getInvoiceById: vi.fn(),
  };

  let controller: BillingController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new BillingController(billingServiceMock as any);
  });

  it('delegates billing account and invoice reads to the service', async () => {
    billingServiceMock.listAccounts.mockResolvedValueOnce([{ id: 'account-1' }]);
    billingServiceMock.listInvoices.mockResolvedValueOnce([{ id: 'invoice-1' }]);
    billingServiceMock.getInvoiceById.mockResolvedValueOnce({ id: 'invoice-1' });

    await expect(controller.listAccounts()).resolves.toEqual([{ id: 'account-1' }]);
    await expect(controller.listInvoices('account-1')).resolves.toEqual([{ id: 'invoice-1' }]);
    await expect(controller.getInvoiceById('invoice-1')).resolves.toEqual({ id: 'invoice-1' });

    expect(billingServiceMock.listInvoices).toHaveBeenCalledWith({
      billingAccountId: 'account-1',
      limit: 20,
    });
    expect(billingServiceMock.getInvoiceById).toHaveBeenCalledWith('invoice-1');
  });

  it('delegates billing mutations to the service', async () => {
    const createAccountDto = {
      name: 'Zone Nord',
      scopeType: 'zone',
      scopeKey: 'zone-north',
      currency: 'EUR',
    };
    const upsertRateRuleDto = {
      chargeType: 'collection_base',
      sourceType: 'collection_event',
      unit: 'event',
      unitPriceCents: 500,
      description: 'Completed collections',
      filters: {},
      isPenalty: false,
      isActive: true,
    };
    const billingRunDto = {
      billingAccountId: '11111111-1111-4111-8111-111111111111',
      periodStart: '2026-03-01T00:00:00.000Z',
      periodEnd: '2026-04-01T00:00:00.000Z',
    };

    billingServiceMock.createAccount.mockResolvedValueOnce({ id: 'account-1' });
    billingServiceMock.upsertRateRule.mockResolvedValueOnce({ id: 'rule-1' });
    billingServiceMock.previewRun.mockResolvedValueOnce({ id: 'preview-1' });
    billingServiceMock.finalizeRun.mockResolvedValueOnce({ id: 'invoice-1' });

    await expect(controller.createAccount(createAccountDto as any)).resolves.toEqual({ id: 'account-1' });
    await expect(
      controller.upsertRateRule('11111111-1111-4111-8111-111111111111', upsertRateRuleDto as any),
    ).resolves.toEqual({ id: 'rule-1' });
    await expect(controller.previewRun(billingRunDto as any)).resolves.toEqual({ id: 'preview-1' });
    await expect(
      controller.finalizeRun(billingRunDto as any, { authUser: { id: 'user-1' } } as any),
    ).resolves.toEqual({ id: 'invoice-1' });

    expect(billingServiceMock.createAccount).toHaveBeenCalledWith(createAccountDto);
    expect(billingServiceMock.upsertRateRule).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      upsertRateRuleDto,
    );
    expect(billingServiceMock.previewRun).toHaveBeenCalledWith(billingRunDto);
    expect(billingServiceMock.finalizeRun).toHaveBeenCalledWith(billingRunDto, 'user-1');
  });

  it('requires an authenticated user id when finalizing a billing run', async () => {
    await expect(controller.finalizeRun({} as any, {} as any)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(billingServiceMock.finalizeRun).not.toHaveBeenCalled();
  });
});
