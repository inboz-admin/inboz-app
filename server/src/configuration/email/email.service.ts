import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const smtpPort = parseInt(this.configService.get('SMTP_PORT')) || 587;
    // Default: allow self-signed certificates (rejectUnauthorized: false)
    // Set SMTP_REJECT_UNAUTHORIZED=true in env to enforce strict certificate validation
    const rejectUnauthorized = this.configService.get('SMTP_REJECT_UNAUTHORIZED') === 'true';
    
    this.logger.log(
      `[EMAIL SERVICE] Initializing SMTP transporter - Host: ${this.configService.get('SMTP_HOST') || 'smtp.gmail.com'}, Port: ${smtpPort}, TLS Reject Unauthorized: ${rejectUnauthorized}`,
    );

    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST') || 'smtp.gmail.com',
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
      tls: {
        // Allow self-signed certificates (useful for Zoho and some SMTP servers)
        // Set SMTP_REJECT_UNAUTHORIZED=true in env to enforce certificate validation
        rejectUnauthorized: rejectUnauthorized,
      },
      // Additional connection options
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000, // 10 seconds
      socketTimeout: 10000, // 10 seconds
    });
  }

  async sendWelcomeEmail(to: string, name: string) {
    const appUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:3000';

    await this.transporter.sendMail({
      from: this.configService.get('SMTP_USER'),
      to: to,
      subject: 'Welcome to Inboz',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header Line -->
                  <tr>
                    <td style="background-color: #2a2a2a; height: 4px; border-radius: 8px 8px 0 0;"></td>
                  </tr>
                  <!-- Heading -->
                  <tr>
                    <td align="center" style="padding: 40px 40px 30px 40px;">
                      <h1 style="margin: 0; color: #1a1a1a; font-size: 32px; font-weight: 600; line-height: 1.2; font-family: 'Inter', sans-serif;">Welcome to Inboz</h1>
                    </td>
                  </tr>
                  <!-- Body Content -->
                  <tr>
                    <td style="padding: 0 40px 30px 40px;">
                      <p style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 16px; line-height: 1.6; font-family: 'Inter', sans-serif;">Hello ${name}!</p>
                      <p style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 16px; line-height: 1.6; font-family: 'Inter', sans-serif;">Thank you for signing up for Inboz. We're really happy to have you!</p>
                      <p style="margin: 0 0 30px 0; color: #8a8a8a; font-size: 16px; line-height: 1.6; font-family: 'Inter', sans-serif;">Click the link below to access your account:</p>
                    </td>
                  </tr>
                  <!-- CTA Button -->
                  <tr>
                    <td align="center" style="padding: 0 40px 40px 40px;">
                      <a href="${appUrl}" style="display: inline-block; background-color: #2a2a2a; color: #fafafa; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; font-family: 'Inter', sans-serif;">Access Your Account</a>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 0 40px 40px 40px; border-top: 1px solid #e5e5e5;">
                      <p style="margin: 30px 0 10px 0; color: #8a8a8a; font-size: 16px; line-height: 1.6; font-family: 'Inter', sans-serif;">Best regards,</p>
                      <p style="margin: 0; color: #1a1a1a; font-size: 16px; font-weight: 600; font-family: 'Inter', sans-serif;">The Inboz Team</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });
  }

  async sendPasswordReset(to: string, resetToken: string) {
    await this.transporter.sendMail({
      from: this.configService.get('SMTP_USER'),
      to: to,
      subject: 'Password Reset Request',
      html: `
        <h1>Reset Your Password</h1>
        <p>Click the link below to reset your password:</p>
        <a href="https://yourapp.com/reset-password?token=${resetToken}">Reset Password</a>
      `,
    });
  }

  async sendNotification(to: string, subject: string, content: string) {
    const fromEmail = this.configService.get('SMTP_USER');
    const smtpHost = this.configService.get('SMTP_HOST') || 'smtp.gmail.com';
    
    this.logger.log(
      `[EMAIL SERVICE] Sending notification email via SMTP - Host: ${smtpHost}, From: ${fromEmail}, To: ${to}, Subject: ${subject}`,
    );

    try {
      const result = await this.transporter.sendMail({
        from: fromEmail,
        to: to,
        subject: subject,
        html: content,
      });

      this.logger.log(
        `[EMAIL SERVICE] ✅ Email sent successfully via SMTP - Message ID: ${result.messageId}, To: ${to}, Subject: ${subject}`,
      );

      return result;
    } catch (error: any) {
      this.logger.error(
        `[EMAIL SERVICE] ❌ Failed to send email via SMTP - To: ${to}, Subject: ${subject}, Error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async sendEmployeeCredentials(
    to: string,
    name: string,
    email: string,
    password: string,
  ) {
    const appUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const loginUrl = `${appUrl}/login`;

    await this.transporter.sendMail({
      from: this.configService.get('SMTP_USER'),
      to: to,
      subject: 'Welcome to Inboz - Your Account Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Welcome to Inboz!</h1>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">Dear ${name},</p>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Welcome to Inboz! Your employee account has been successfully created. Below are your login credentials:
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
              <h3 style="color: #333; margin-top: 0;">Your Login Credentials:</h3>
              <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 10px 0;"><strong>Temporary Password:</strong> <code style="background-color: #e9ecef; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${password}</code></p>
            </div>
            
            <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff; text-align: center;">
              <h3 style="color: #333; margin-top: 0;">Ready to Get Started?</h3>
              <p style="margin: 15px 0; color: #555;">Click the button below to access your account:</p>
              <a href="${loginUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Login to Inboz</a>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p style="margin: 0; color: #856404;"><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
            </div>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              If you have any questions or need assistance, please don't hesitate to contact our support team.
            </p>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Best regards,<br>
              <strong>Inboz Team</strong>
            </p>
          </div>
        </div>
      `,
    });
  }

  async sendStudentCredentials(
    to: string,
    name: string,
    email: string,
    password: string,
  ) {
    const appUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const loginUrl = `${appUrl}/login`;

    await this.transporter.sendMail({
      from: this.configService.get('SMTP_USER'),
      to: to,
      subject: 'Welcome to Inboz - Your Student Account Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Welcome to Inboz!</h1>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">Dear ${name},</p>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Welcome to Inboz! Your student account has been successfully created. Below are your login credentials:
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h3 style="color: #333; margin-top: 0;">Your Login Credentials:</h3>
              <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 10px 0;"><strong>Temporary Password:</strong> <code style="background-color: #e9ecef; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${password}</code></p>
            </div>
            
            <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; text-align: center;">
              <h3 style="color: #333; margin-top: 0;">Ready to Get Started?</h3>
              <p style="margin: 15px 0; color: #555;">Click the button below to access your account:</p>
              <a href="${loginUrl}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Login to Inboz</a>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p style="margin: 0; color: #856404;"><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
            </div>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              If you have any questions or need assistance, please don't hesitate to contact our support team.
            </p>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Best regards,<br>
              <strong>Inboz Team</strong>
            </p>
          </div>
        </div>
      `,
    });
  }

  async sendPasswordResetOtp(to: string, name: string, otp: string) {
    const appUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const loginUrl = `${appUrl}/login`;

    await this.transporter.sendMail({
      from: this.configService.get('SMTP_USER'),
      to: to,
      subject: 'Inboz - Password Reset Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Password Reset Verification - Inboz</h1>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">Dear ${name},</p>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              We received a request to reset your password for your Inboz account. To proceed with the password reset, please use the verification code below:
            </p>
            
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545; text-align: center;">
              <h3 style="color: #333; margin-top: 0; margin-bottom: 20px;">Your Verification Code:</h3>
              <div style="background-color: #e9ecef; padding: 20px; border-radius: 8px; display: inline-block; border: 2px solid #dc3545;">
                <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; color: #dc3545; letter-spacing: 8px;">${otp}</span>
              </div>
              <p style="margin: 15px 0 0 0; color: #666; font-size: 14px;">This code will expire in 15 minutes</p>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p style="margin: 0; color: #856404;"><strong>Security Notice:</strong> If you did not request this password reset, please ignore this email and contact our support team immediately.</p>
            </div>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Enter this verification code in the password reset form to continue with setting your new password.
            </p>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              If you have any questions or need assistance, please don't hesitate to contact our support team.
            </p>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Best regards,<br>
              <strong>Inboz Team</strong>
            </p>
          </div>
        </div>
      `,
    });
  }

  getInviteEmailHtml(
    to: string,
    organizationName: string,
    inviterName?: string,
  ): string {
    const appUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:3000';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header Line -->
                <tr>
                  <td style="background-color: #2a2a2a; height: 4px; border-radius: 8px 8px 0 0;"></td>
                </tr>
                <!-- Heading -->
                <tr>
                  <td align="center" style="padding: 40px 40px 30px 40px;">
                    <h1 style="margin: 0; color: #1a1a1a; font-size: 32px; font-weight: 600; line-height: 1.2; font-family: 'Inter', sans-serif;">You're Invited to Inboz</h1>
                  </td>
                </tr>
                <!-- Body Content -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <p style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 16px; line-height: 1.6; font-family: 'Inter', sans-serif;">Hello,</p>
                    <p style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 16px; line-height: 1.6; font-family: 'Inter', sans-serif;">
                      ${inviterName ? `<strong>${inviterName}</strong> has ` : 'You have been '}invited to join <strong>${organizationName}</strong> on Inboz.
                    </p>
                    <p style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 16px; line-height: 1.6; font-family: 'Inter', sans-serif;">We're really happy to have you as part of the team!</p>
                    <p style="margin: 0 0 30px 0; color: #8a8a8a; font-size: 16px; line-height: 1.6; font-family: 'Inter', sans-serif;">Click the link below to access your account:</p>
                  </td>
                </tr>
                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding: 0 40px 30px 40px;">
                    <a href="${appUrl}" style="display: inline-block; background-color: #2a2a2a; color: #fafafa; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; font-family: 'Inter', sans-serif;">Access Your Account</a>
                  </td>
                </tr>
                <!-- Note Box -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <div style="background-color: #f5f5f5; padding: 16px; border-radius: 6px; border-left: 4px solid #2a2a2a;">
                      <p style="margin: 0; color: #1a1a1a; font-size: 14px; line-height: 1.5; font-family: 'Inter', sans-serif;">
                        <strong>Note:</strong> Please use your Google Workspace account (${to}) to sign in and activate your account.
                      </p>
                    </div>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding: 0 40px 40px 40px; border-top: 1px solid #e5e5e5;">
                    <p style="margin: 30px 0 10px 0; color: #8a8a8a; font-size: 16px; line-height: 1.6; font-family: 'Inter', sans-serif;">Best regards,</p>
                    <p style="margin: 0; color: #1a1a1a; font-size: 16px; font-weight: 600; font-family: 'Inter', sans-serif;">The Inboz Team</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  async sendPlatformEmployeeCredentials(
    to: string,
    name: string,
    email: string,
    password: string,
  ) {
    const appUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const loginUrl = `${appUrl}/admin/login`;

    await this.transporter.sendMail({
      from: this.configService.get('SMTP_USER'),
      to: to,
      subject: 'Welcome to Inboz - Your Platform Employee Account Credentials',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header Line -->
                  <tr>
                    <td style="background-color: #2a2a2a; height: 4px; border-radius: 8px 8px 0 0;"></td>
                  </tr>
                  <!-- Heading -->
                  <tr>
                    <td align="center" style="padding: 40px 40px 30px 40px;">
                      <h1 style="margin: 0; color: #1a1a1a; font-size: 32px; font-weight: 600; line-height: 1.2; font-family: 'Inter', sans-serif;">Welcome to Inboz</h1>
                    </td>
                  </tr>
                  <!-- Body Content -->
                  <tr>
                    <td style="padding: 0 40px 30px 40px;">
                      <p style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 16px; line-height: 1.6; font-family: 'Inter', sans-serif;">Hello ${name}!</p>
                      <p style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 16px; line-height: 1.6; font-family: 'Inter', sans-serif;">Your platform employee account has been successfully created. Below are your login credentials:</p>
                      
                      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2a2a2a;">
                        <h3 style="color: #1a1a1a; margin-top: 0; font-size: 18px; font-weight: 600;">Your Login Credentials:</h3>
                        <p style="margin: 10px 0; color: #1a1a1a; font-size: 16px;"><strong>Email:</strong> ${email}</p>
                        <p style="margin: 10px 0; color: #1a1a1a; font-size: 16px;"><strong>Password:</strong> <code style="background-color: #e9ecef; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 14px;">${password}</code></p>
                      </div>
                      
                      <p style="margin: 20px 0 30px 0; color: #8a8a8a; font-size: 16px; line-height: 1.6; font-family: 'Inter', sans-serif;">Click the button below to access your account:</p>
                    </td>
                  </tr>
                  <!-- CTA Button -->
                  <tr>
                    <td align="center" style="padding: 0 40px 40px 40px;">
                      <a href="${loginUrl}" style="display: inline-block; background-color: #2a2a2a; color: #fafafa; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; font-family: 'Inter', sans-serif;">Login to Platform</a>
                    </td>
                  </tr>
                  <!-- Security Notice -->
                  <tr>
                    <td style="padding: 0 40px 30px 40px;">
                      <div style="background-color: #fff3cd; padding: 16px; border-radius: 6px; border-left: 4px solid #ffc107;">
                        <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.5; font-family: 'Inter', sans-serif;">
                          <strong>Important:</strong> Please change your password after your first login for security purposes.
                        </p>
                      </div>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 0 40px 40px 40px; border-top: 1px solid #e5e5e5;">
                      <p style="margin: 30px 0 10px 0; color: #8a8a8a; font-size: 16px; line-height: 1.6; font-family: 'Inter', sans-serif;">Best regards,</p>
                      <p style="margin: 0; color: #1a1a1a; font-size: 16px; font-weight: 600; font-family: 'Inter', sans-serif;">The Inboz Team</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });
  }

  async sendForgotPassword(to: string, name: string, newPassword: string) {
    const appUrl =
      this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const loginUrl = `${appUrl}/login`;

    await this.transporter.sendMail({
      from: this.configService.get('SMTP_USER'),
      to: to,
      subject: 'Inboz - Password Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Password Reset - Inboz</h1>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">Dear ${name},</p>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              We received a request to reset your password for your Inboz account. Your new temporary password is below:
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <h3 style="color: #333; margin-top: 0;">Your New Password:</h3>
              <p style="margin: 10px 0;"><strong>Email:</strong> ${to}</p>
              <p style="margin: 10px 0;"><strong>New Password:</strong> <code style="background-color: #e9ecef; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${newPassword}</code></p>
            </div>
            
            <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545; text-align: center;">
              <h3 style="color: #333; margin-top: 0;">Login Now</h3>
              <p style="margin: 15px 0; color: #555;">Click the button below to login with your new password:</p>
              <a href="${loginUrl}" style="display: inline-block; background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Login to Inboz</a>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p style="margin: 0; color: #856404;"><strong>Important Security Notice:</strong> Please change this password immediately after logging in. If you did not request this password reset, please contact our support team immediately.</p>
            </div>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              For your security, this password should be changed as soon as possible after logging in.
            </p>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              If you have any questions or need assistance, please don't hesitate to contact our support team.
            </p>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Best regards,<br>
              <strong>Inboz Team</strong>
            </p>
          </div>
        </div>
      `,
    });
  }
}
