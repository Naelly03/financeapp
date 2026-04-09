import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SummaryService, SummaryResult } from './summary.service';
import { CurrentUser, JwtPayload } from '../../common/decorators';

class SummaryQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(2000)
  year?: number;
}

@ApiBearerAuth()
@Controller('summary')
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get()
  getSummary(
    @CurrentUser() user: JwtPayload,
    @Query() query: SummaryQueryDto,
  ): Promise<SummaryResult> {
    const now = new Date();
    const month = query.month ?? now.getMonth() + 1;
    const year = query.year ?? now.getFullYear();
    return this.summaryService.getSummary(user.sub, month, year);
  }
}
