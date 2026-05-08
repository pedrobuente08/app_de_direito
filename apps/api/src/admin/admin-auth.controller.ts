import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/metadata';
import { ThrottlePresets } from '../common/throttle-presets';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuth: AdminAuthService) {}

  @Public()
  @Post('bootstrap')
  @Throttle(ThrottlePresets.adminBootstrap)
  bootstrap(@Body() dto: BootstrapAdminDto) {
    return this.adminAuth.bootstrap(dto);
  }

  @Public()
  @Post('login')
  @Throttle(ThrottlePresets.adminLogin)
  login(@Body() dto: AdminLoginDto) {
    return this.adminAuth.login(dto);
  }
}
