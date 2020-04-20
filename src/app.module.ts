import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import {EthersService} from './ethers.service';
import {AppFormatter} from './app.formatter';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppFormatter, EthersService, AppService],
})
export class AppModule {}
