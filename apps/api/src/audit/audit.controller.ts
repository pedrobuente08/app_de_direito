import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ThrottlePresets } from '../common/throttle-presets';
import { Roles } from '../common/metadata';
import { AuditService } from './audit.service';
import { ListAuditLogQueryDto } from './dto/list-audit-log.query.dto';

@Controller('audit-log')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Roles('admin', 'adm')
  @Throttle(ThrottlePresets.auditLogList)
  listar(
    @CurrentUser() user: AuthUser,
    @Query() query: ListAuditLogQueryDto,
  ) {
    return this.audit.listar(user.escritorioId, query);
  }
}
