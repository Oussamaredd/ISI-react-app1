import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Inject,
  InternalServerErrorException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { AuthenticatedUserGuard } from '../auth/authenticated-user.guard.js';
import type { RequestWithAuthUser } from '../auth/authorization.types.js';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { PermissionsGuard } from '../auth/permissions.guard.js';
import { parsePaginationParams } from '../common/http/pagination.js';

import { CreateCommentDto } from './dto/create-comment.dto.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { UpdateCommentDto } from './dto/update-comment.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';
import { TicketsService } from './tickets.service.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeUuid = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : undefined;
};

const normalizeSearch = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const SUPPORT_CATEGORY_DEFINITIONS = [
  {
    key: 'general_help',
    label: 'General Help',
    aliases: ['general', 'help', 'information'],
  },
  {
    key: 'container_overflow',
    label: 'Container Overflow',
    aliases: ['overflow', 'bin_overflow'],
  },
  {
    key: 'collection_delay',
    label: 'Collection Delay',
    aliases: ['delay', 'pickup_delay'],
  },
  {
    key: 'damaged_container',
    label: 'Damaged Container',
    aliases: ['damage', 'broken_bin'],
  },
  {
    key: 'route_request',
    label: 'Route Request',
    aliases: ['route', 'schedule_request'],
  },
  {
    key: 'billing',
    label: 'Billing',
    aliases: ['invoice', 'payment'],
  },
  {
    key: 'other',
    label: 'Other',
    aliases: ['misc', 'legacy_other'],
  },
] as const;

const SUPPORT_CATEGORY_ALIAS_MAP = new Map<string, string>(
  SUPPORT_CATEGORY_DEFINITIONS.flatMap((entry) => [
    [entry.key, entry.key],
    ...entry.aliases.map((alias) => [alias, entry.key] as const),
  ]),
);

const normalizeSupportCategory = (value?: string) => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return SUPPORT_CATEGORY_ALIAS_MAP.get(normalized) ?? undefined;
};

@Controller('tickets')
@UseGuards(AuthenticatedUserGuard, PermissionsGuard)
@RequirePermissions('tickets.read')
export class TicketsController {
  constructor(@Inject(TicketsService) private readonly ticketsService: TicketsService) {}

  @Get()
  async findAll(
    @Query('limit') limitParam?: string,
    @Query('offset') offsetParam?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('support_category') supportCategorySnake?: string,
    @Query('supportCategory') supportCategoryCamel?: string,
    @Query('assignee_id') assigneeIdParam?: string,
    @Query('assigneeId') assigneeIdCamel?: string,
    @Query('q') qParam?: string,
    @Query('search') searchParam?: string,
  ) {
    const parsedLimit = Number.parseInt(limitParam ?? '', 10);
    const parsedOffset = Number.parseInt(offsetParam ?? '', 10);

    const limit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 20 : Math.min(parsedLimit, 100);
    const offset = Number.isNaN(parsedOffset) || parsedOffset < 0 ? 0 : parsedOffset;
    const assigneeId = normalizeUuid(assigneeIdParam ?? assigneeIdCamel);
    const search = normalizeSearch(qParam ?? searchParam);
    const supportCategory = normalizeSupportCategory(supportCategorySnake ?? supportCategoryCamel);

    try {
      const { tickets, total } = await this.ticketsService.findAll({
        limit,
        offset,
        status,
        priority,
        supportCategory,
        assigneeId,
        search,
      });
      return { tickets, total, limit, offset };
    } catch (error) {
      console.error('Failed to fetch tickets', error);
      throw new InternalServerErrorException('Unable to fetch tickets');
    }
  }

  @Get('support/categories')
  async supportCategories() {
    return {
      categories: SUPPORT_CATEGORY_DEFINITIONS,
      chatbotContract: {
        version: '1.0',
        input: {
          message: 'string',
          context: {
            category: 'optional support category key',
            ticketId: 'optional ticket uuid',
          },
        },
        output: {
          categorySuggestion: 'support category key',
          confidence: 'number between 0 and 1',
          responseText: 'assistant reply text',
          escalationRecommended: 'boolean',
        },
      },
    };
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.ticketsService.findOne(id);
  }

  @Get(':id/comments')
  async listComments(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('page') pageParam?: string,
    @Query('pageSize') pageSizeParam?: string,
  ) {
    const pagination = parsePaginationParams(pageParam, pageSizeParam);

    try {
      const { comments, total } = await this.ticketsService.listComments(id, {
        page: pagination.page,
        pageSize: pagination.pageSize,
      });
      const hasNext = pagination.offset + pagination.limit < total;
      return {
        comments,
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        pagination: {
          total,
          page: pagination.page,
          pageSize: pagination.pageSize,
          hasNext,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Failed to fetch comments', error);
      throw new InternalServerErrorException('Unable to fetch comments');
    }
  }

  @Post(':id/comments')
  @RequirePermissions('tickets.read')
  async addComment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateCommentDto,
    @Req() request: RequestWithAuthUser,
  ) {
    const body = (dto.body ?? dto.content ?? '').trim();
    if (!body) {
      throw new BadRequestException('Comment body is required');
    }
    const actor = this.requireActor(request);
    try {
      return await this.ticketsService.addComment(id, body, actor);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Failed to add comment', error);
      throw new InternalServerErrorException('Unable to add comment');
    }
  }

  @Put(':id/comments/:commentId')
  @RequirePermissions('tickets.read')
  async updateComment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @Body() dto: UpdateCommentDto,
    @Req() request: RequestWithAuthUser,
  ) {
    const body = (dto.body ?? dto.content ?? '').trim();
    if (!body) {
      throw new BadRequestException('Comment body is required');
    }
    const actor = this.requireActor(request);
    try {
      return await this.ticketsService.updateComment(id, commentId, body, actor);
    } catch (error) {
      console.error('Failed to update comment', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Unable to update comment');
    }
  }

  @Delete(':id/comments/:commentId')
  @RequirePermissions('tickets.read')
  async deleteComment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @Req() request: RequestWithAuthUser,
  ) {
    const actor = this.requireActor(request);
    try {
      return await this.ticketsService.deleteComment(id, commentId, actor);
    } catch (error) {
      console.error('Failed to delete comment', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Unable to delete comment');
    }
  }

  @Get(':id/activity')
  async listActivity(@Param('id', new ParseUUIDPipe()) id: string) {
    try {
      const activity = await this.ticketsService.listActivity(id);
      return { activity };
    } catch (error) {
      console.error('Failed to fetch activity', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Unable to fetch activity');
    }
  }

  @Post()
  @RequirePermissions('tickets.write')
  create(@Body() dto: CreateTicketDto) {
    return this.ticketsService.create(dto);
  }

  private requireActor(request: RequestWithAuthUser) {
    const authUser = request.authUser;
    if (!authUser) {
      throw new UnauthorizedException();
    }

    return {
      id: authUser.id,
      role: authUser.role,
      roles: authUser.roles,
    };
  }

  @Put(':id')
  @RequirePermissions('tickets.write')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('tickets.write')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.ticketsService.remove(id);
  }
}
