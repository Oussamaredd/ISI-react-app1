import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  InternalServerErrorException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { TicketsService } from './tickets.service.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { UpdateCommentDto } from './dto/update-comment.dto.js';
import { AssignHotelDto } from './dto/assign-hotel.dto.js';

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

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  async findAll(
    @Query('limit') limitParam?: string,
    @Query('offset') offsetParam?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('hotel_id') hotelIdParam?: string,
    @Query('hotelId') hotelIdCamel?: string,
    @Query('assignee_id') assigneeIdParam?: string,
    @Query('assigneeId') assigneeIdCamel?: string,
    @Query('q') qParam?: string,
    @Query('search') searchParam?: string,
  ) {
    const parsedLimit = Number.parseInt(limitParam ?? '', 10);
    const parsedOffset = Number.parseInt(offsetParam ?? '', 10);

    const limit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 20 : Math.min(parsedLimit, 100);
    const offset = Number.isNaN(parsedOffset) || parsedOffset < 0 ? 0 : parsedOffset;
    const hotelId = normalizeUuid(hotelIdParam ?? hotelIdCamel);
    const assigneeId = normalizeUuid(assigneeIdParam ?? assigneeIdCamel);
    const search = normalizeSearch(qParam ?? searchParam);

    try {
      const { tickets, total } = await this.ticketsService.findAll({
        limit,
        offset,
        status,
        priority,
        hotelId,
        assigneeId,
        search,
      });
      return { tickets, total, limit, offset };
    } catch (error) {
      console.error('Failed to fetch tickets', error);
      throw new InternalServerErrorException('Unable to fetch tickets');
    }
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
    const page = Number.isFinite(Number(pageParam)) && Number(pageParam) > 0 ? Number(pageParam) : 1;
    const pageSizeRaw = Number(pageSizeParam);
    const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.min(pageSizeRaw, 100) : 20;

    try {
      const { comments, total } = await this.ticketsService.listComments(id, { page, pageSize });
      const hasNext = page * pageSize < total;
      return {
        comments,
        total,
        page,
        pageSize,
        pagination: { total, page, pageSize, hasNext },
      };
    } catch (error) {
      console.error('Failed to fetch comments', error);
      throw new InternalServerErrorException('Unable to fetch comments');
    }
  }

  @Post(':id/comments')
  async addComment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateCommentDto,
  ) {
    const body = dto.body ?? dto.content;
    if (!body) {
      throw new BadRequestException('Comment body is required');
    }
    try {
      return await this.ticketsService.addComment(id, body);
    } catch (error) {
      console.error('Failed to add comment', error);
      throw new InternalServerErrorException('Unable to add comment');
    }
  }

  @Put(':id/comments/:commentId')
  async updateComment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    const body = dto.body ?? dto.content;
    if (!body) {
      throw new BadRequestException('Comment body is required');
    }
    try {
      return await this.ticketsService.updateComment(id, commentId, body);
    } catch (error) {
      console.error('Failed to update comment', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Unable to update comment');
    }
  }

  @Delete(':id/comments/:commentId')
  async deleteComment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
  ) {
    try {
      return await this.ticketsService.deleteComment(id, commentId);
    } catch (error) {
      console.error('Failed to delete comment', error);
      if (error instanceof NotFoundException) {
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
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Unable to fetch activity');
    }
  }

  @Post()
  create(@Body() dto: CreateTicketDto) {
    return this.ticketsService.create(dto);
  }

  @Post(':id/assign-hotel')
  @HttpCode(200)
  async assignHotel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssignHotelDto,
  ) {
    try {
      return await this.ticketsService.assignHotel(id, dto.hotelId);
    } catch (error) {
      console.error('Failed to assign hotel', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Unable to assign hotel');
    }
  }

  @Put(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.ticketsService.remove(id);
  }
}
