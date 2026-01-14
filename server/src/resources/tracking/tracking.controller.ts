import { Controller, Get, Post, Param, Req, Res, Query, Logger, Headers } from '@nestjs/common';
import { Response, Request } from 'express';
import { EmailTrackingService } from 'src/common/services/email-tracking.service';
import { EmailEventType } from '../campaigns/entities/email-tracking-event.entity';
import { Public } from 'src/configuration/jwt/public.decorator';

@Controller()
export class TrackingController {
  private readonly logger = new Logger(TrackingController.name);

  constructor(private readonly emailTrackingService: EmailTrackingService) {}

  /**
   * Test endpoint to verify tracking module is working
   * GET /api/v1/tracking/test
   */
  @Public()
  @Get('test')
  test() {
    this.logger.log('✅ Tracking module is working!');
    return { status: 'ok', message: 'Tracking module is working' };
  }

  /**
   * Tracking pixel endpoint for email opens
   * GET /api/v1/tracking/open/:emailMessageId
   */
  @Public()
  @Get('open/:emailMessageId')
  async trackOpen(
    @Param('emailMessageId') emailMessageId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`🔔 Open tracking request received for email: ${emailMessageId}`);
      const userAgent = req.headers['user-agent'] || 'Unknown';
      const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';

      this.logger.debug(`📧 User-Agent: ${userAgent}, IP: ${ipAddress}`);

      // Record the open event
      await this.emailTrackingService.recordEvent(emailMessageId, EmailEventType.OPENED, {
        userAgent,
        ipAddress,
      });

      // Return a 1x1 transparent GIF
      const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64',
      );

      res.setHeader('Content-Type', 'image/gif');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.send(pixel);

      this.logger.debug(`Open tracked for email ${emailMessageId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to track open: ${err.message}`);
      // Still return pixel even on error
      const pixel = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64',
      );
      res.setHeader('Content-Type', 'image/gif');
      res.send(pixel);
    }
  }

  /**
   * Click tracking redirect endpoint
   * GET /api/v1/tracking/click/:emailMessageId?url=...
   */
  @Public()
  @Get('click/:emailMessageId')
  async trackClick(
    @Param('emailMessageId') emailMessageId: string,
    @Query('url') url: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userAgent = req.headers['user-agent'] || 'Unknown';
      const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';

      // Record the click event
      await this.emailTrackingService.recordEvent(emailMessageId, EmailEventType.CLICKED, {
        clickedUrl: url,
        userAgent,
        ipAddress,
      });

      // Decode and redirect
      const decodedUrl = decodeURIComponent(url);
      
      // Validate URL to prevent open redirect attacks
      if (decodedUrl.startsWith('http://') || decodedUrl.startsWith('https://') || decodedUrl.startsWith('//')) {
        this.logger.debug(`Click tracked for email ${emailMessageId} - redirecting to ${decodedUrl}`);
        res.redirect(decodedUrl);
      } else {
        this.logger.warn(`Invalid redirect URL: ${decodedUrl}`);
        res.status(400).send('Invalid URL');
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to track click: ${err.message}`);
      res.status(500).send('Error tracking click');
    }
  }

  /**
   * Unsubscribe endpoint
   * GET /api/v1/tracking/unsubscribe/:emailMessageId
   */
  @Public()
  @Get('unsubscribe/:emailMessageId')
  async unsubscribe(
    @Param('emailMessageId') emailMessageId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`🔔 Unsubscribe GET request received for email: ${emailMessageId}`);
      await this.emailTrackingService.handleUnsubscribe(emailMessageId);

      // Return an HTML confirmation page
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Unsubscribed - Inboz</title>
          <link rel="icon" type="image/svg+xml" href="https://inboz.io/favicon.svg" />
          <link rel="icon" type="image/x-icon" href="https://inboz.io/favicon.ico" />
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 40px;
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #333; margin-bottom: 20px; }
            p { color: #666; font-size: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✓ Unsubscribed Successfully</h1>
            <p>You have been removed from our mailing list.</p>
            <p>We're sorry to see you go!</p>
          </div>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.send(html);

      this.logger.log(`Unsubscribe processed for email ${emailMessageId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to process unsubscribe: ${err.message}`);

      // Return error page
      const errorHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Unsubscribe Error - Inboz</title>
          <link rel="icon" type="image/svg+xml" href="https://inboz.io/favicon.svg" />
          <link rel="icon" type="image/x-icon" href="https://inboz.io/favicon.ico" />
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 40px;
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #d32f2f; margin-bottom: 20px; }
            p { color: #666; font-size: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⚠ Unsubscribe Error</h1>
            <p>We encountered an error processing your unsubscribe request.</p>
            <p>Please contact support for assistance.</p>
          </div>
        </body>
        </html>
      `;

      res.status(500).send(errorHtml);
    }
  }

  /**
   * POST endpoint for unsubscribe (alternative to GET)
   * POST /api/v1/tracking/unsubscribe/:emailMessageId
   */
  @Public()
  @Post('unsubscribe/:emailMessageId')
  async unsubscribePost(
    @Param('emailMessageId') emailMessageId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Same logic as GET endpoint
    return this.unsubscribe(emailMessageId, req, res);
  }
}

