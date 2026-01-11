import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventsService } from './events.service';
import { eventsConfig } from './events.config';

@Global()
@Module({
  imports: [EventEmitterModule.forRoot(eventsConfig)],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
