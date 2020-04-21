import { Module } from '@nestjs/common';
import { AppController } from './app.controller';

import { AppService } from './shared/services/app.service';
import { EthersService } from './shared/services/ethers.service';
import { AuthModule } from './shared/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AppController],
  providers: [
    EthersService,
    AppService,
  ],
})
export class AppModule {}
