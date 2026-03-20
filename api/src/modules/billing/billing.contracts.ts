export type BillingSourceType = 'alert_event' | 'collection_event';
export type BillingUnit = 'event' | 'liter';

export type BillingScopeType = 'zone';

export type BillingPreviewRequest = {
  billingAccountId: string;
  periodStart: Date;
  periodEnd: Date;
};

export type BillingSourceAllocationPreview = {
  sourceId: string;
  amountCents: number;
  quantity: number;
  metadata: Record<string, unknown>;
};

export type BillingLineItemPreview = {
  rateRuleId: string;
  chargeType: string;
  sourceType: BillingSourceType;
  description: string;
  unit: BillingUnit;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  isPenalty: boolean;
  sourceAllocations: BillingSourceAllocationPreview[];
};

export type BillingPreview = {
  billingAccount: {
    id: string;
    name: string;
    scopeType: BillingScopeType;
    scopeKey: string;
    currency: string;
  };
  periodStart: string;
  periodEnd: string;
  subtotalCents: number;
  penaltyTotalCents: number;
  totalCents: number;
  lineItems: BillingLineItemPreview[];
};

export type BillingRateRuleRecord = {
  id: string;
  billingAccountId: string;
  chargeType: string;
  sourceType: BillingSourceType;
  unit: BillingUnit;
  unitPriceCents: number;
  description: string;
  filters: Record<string, unknown>;
  isPenalty: boolean;
  isActive: boolean;
};

export type BillingFinalizeOptions = {
  simulateFailureStage?: 'after_invoice_line_items';
};
