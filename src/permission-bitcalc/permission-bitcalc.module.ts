import { Global, Module } from '@nestjs/common';
import { PermissionBitcalcService } from './permission-bitcalc.service';

@Global()
@Module({
  providers: [PermissionBitcalcService],
  exports: [PermissionBitcalcService],
})
export class PermissionBitcalcModule {}
