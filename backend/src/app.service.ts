import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      service: 'CJ7 IA API',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
