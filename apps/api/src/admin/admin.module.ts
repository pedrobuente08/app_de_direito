import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminEscritoriosController } from './admin-escritorios.controller';
import { AdminEscritoriosService } from './admin-escritorios.service';
import { AdminJwtStrategy } from './admin-jwt.strategy';

@Module({
  imports: [PassportModule.register({})],
  controllers: [AdminAuthController, AdminEscritoriosController],
  providers: [AdminAuthService, AdminJwtStrategy, AdminEscritoriosService],
})
export class AdminModule {}
