import { Global, Module } from '@nestjs/common';
import { EnvConfig } from './env-config';

@Global()
@Module({
  providers: [
    {
      provide: EnvConfig,
      useFactory: () => new EnvConfig(),
    },
  ],
  exports: [EnvConfig],
})
export class EnvConfigModule {}
