import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class EventsService {
  constructor(private eventEmitter: EventEmitter2) {}

  emit(event: string, payload: any) {
    return this.eventEmitter.emit(event, payload);
  }

  // Example event listener
  onEvent(event: string, listener: (...args: any[]) => void) {
    return this.eventEmitter.on(event, listener);
  }
}
