import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { AuthenticatedUserGuard } from '../auth/authenticated-user.guard.js';
import type { RequestWithAuthUser } from '../auth/authorization.types.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';

import { BillingService } from './billing.service.js';
import { BillingRunDto } from './dto/billing-run.dto.js';
import { CreateBillingAccountDto } from './dto/create-billing-account.dto.js';
import { UpsertBillingRateRuleDto } from './dto/upsert-billing-rate-rule.dto.js';

@Controller('billing')
@UseGuards(AuthenticatedUserGuard, PermissionsGuard)
export class BillingController {
  constructor(@Inject(BillingService) private readonly billingService: BillingService) {}

  @Get('accounts')
  @RequirePermissions('ecotrack.billing.read')
  async listAccounts() {
    return this.billingService.listAccounts();
  }

  @Post('accounts')
  @RequirePermissions('ecotrack.billing.write')
  async createAccount(@Body() dto: CreateBillingAccountDto) {
    return this.billingService.createAccount(dto);
  }

  @Post('accounts/:billingAccountId/rate-rules')
  @RequirePermissions('ecotrack.billing.write')
  async upsertRateRule(
    @Param('billingAccountId', new ParseUUIDPipe()) billingAccountId: string,
    @Body() dto: UpsertBillingRateRuleDto,
  ) {
    return this.billingService.upsertRateRule(billingAccountId, dto);
  }

  @Post('runs/preview')
  @RequirePermissions('ecotrack.billing.read')
  async previewRun(@Body() dto: BillingRunDto) {
    return this.billingService.previewRun(dto);
  }

  @Post('runs/finalize')
  @RequirePermissions('ecotrack.billing.write')
  async finalizeRun(@Body() dto: BillingRunDto, @Req() request: RequestWithAuthUser) {
    return this.billingService.finalizeRun(dto, this.requireActorUserId(request));
  }

  @Get('invoices')
  @RequirePermissions('ecotrack.billing.read')
  async listInvoices(
    @Query('billingAccountId') billingAccountId?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.billingService.listInvoices({
      billingAccountId,
      limit,
    });
  }

  @Get('invoices/:invoiceId')
  @RequirePermissions('ecotrack.billing.read')
  async getInvoiceById(@Param('invoiceId', new ParseUUIDPipe()) invoiceId: string) {
    return this.billingService.getInvoiceById(invoiceId);
  }

  private requireActorUserId(request: RequestWithAuthUser) {
    const actorUserId = request.authUser?.id;
    if (!actorUserId) {
      throw new UnauthorizedException('Authenticated user context is required.');
    }

    return actorUserId;
  }
}
