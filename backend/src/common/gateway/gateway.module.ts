import { Module } from '@nestjs/common';
import { ProctoringGateway } from './proctoring.gateway';

@Module({
  providers: [ProctoringGateway],
})
export class GatewayModule {}
