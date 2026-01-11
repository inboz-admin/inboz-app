import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { Agent } from 'https'; // Import Agent from https

@Global()
@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: () => ({
        baseURL: 'https://api.example.com', // Replace with your API base URL
        timeout: 5000, // Set a timeout
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff', // Prevent MIME type sniffing
          'X-Frame-Options': 'DENY', // Prevent clickjacking
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains', // Enforce HTTPS
          'X-XSS-Protection': '1; mode=block', // Enable XSS protection
        },
        httpsAgent: new Agent({
          rejectUnauthorized: true, // Ensure SSL certificate validation
        }),
      }),
    }),
  ],
  exports: [HttpModule],
})
export class AxiosModule {}
