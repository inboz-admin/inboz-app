import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { CryptoUtilityService } from './crypto-utility.service';

export interface SendEmailParams {
  accessToken: string;
  to: string;
  from: string;
  fromName?: string;
  subject: string;
  html?: string; // Optional - only required if sending HTML format
  text?: string; // Optional - only required if sending TEXT format
  threadHeaders?: {
    inReplyTo?: string; // Message-ID from previous email
    references?: string; // References header value
    threadId?: string; // Gmail thread ID (for Thread-Id header)
  };
}

export interface GmailSendResult {
  id: string; // Gmail API message ID (internal ID, not stored in DB)
  threadId: string; // Gmail Thread ID (stored in gmailThreadId column)
  labelIds?: string[];
  gmailMessageId?: string; // Clean Message-ID header from Gmail (without < > brackets, stored in gmailMessageId column for threading)
}

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);

  constructor(private readonly cryptoUtilityService: CryptoUtilityService) {}

  /**
   * Send an email via Gmail API
   */
  async sendEmail(params: SendEmailParams): Promise<GmailSendResult> {
    try {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: params.accessToken,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Create the email message
      const message = this.createMessage(
        params.to,
        params.from,
        params.subject,
        params.html,
        params.fromName,
        params.text,
        params.threadHeaders,
      );

      // Send the email
      // If threadHeaders.threadId is provided, use it to explicitly thread the email
      const sendRequest: any = {
        userId: 'me',
        requestBody: {
          raw: message,
        },
      };

      // Gmail API: Use threadId parameter to explicitly thread the message
      // This is more reliable than just headers
      if (params.threadHeaders?.threadId) {
        sendRequest.requestBody.threadId = params.threadHeaders.threadId;
        this.logger.log(
          `🔗 [GMAIL API] Using explicit threadId parameter in request body: ${params.threadHeaders.threadId}`
        );
      } else {
        this.logger.log(`🔗 [GMAIL API] No threadId parameter provided - will create new thread`);
      }

      // Log the complete raw message before encoding (for debugging)
      const rawMessage = this.getRawMessageForLogging(
        params.to,
        params.from,
        params.subject,
        params.html,
        params.fromName,
        params.text,
        params.threadHeaders,
      );
      this.logger.log(`📧 [RAW MESSAGE] Complete message being sent:\n${rawMessage}`);
      this.logger.log(`📧 [ENCODED MESSAGE] Base64URL length: ${message.length} characters`);

      const result = await gmail.users.messages.send(sendRequest);

      const messageId = result.data.id;
      const threadId = result.data.threadId || result.data.id; // Thread ID can be same as message ID for new threads

      this.logger.log(
        `Email sent successfully to ${params.to}. Message ID: ${messageId}, Thread ID: ${threadId}`,
      );

      // Fetch the actual Gmail Message-ID header for threading
      // Reference: Send first email → return { threadId, cleanMessageId }
      // Use format: 'full' to get Message-ID (more reliable than metadata)
      const cleanMessageId = await this.getRealMessageId(gmail, messageId);
      
      // Store both threadId and cleanMessageId in DB
      const gmailMessageId = cleanMessageId;

      // Log if threadId matches what we requested
      if (params.threadHeaders?.threadId) {
        if (threadId === params.threadHeaders.threadId) {
          this.logger.log(
            `✅ [THREADING SUCCESS] Thread ID matches requested: ${threadId} (threaded correctly)`
          );
        } else {
          this.logger.warn(
            `⚠️ [THREADING MISMATCH] Requested threadId: ${params.threadHeaders.threadId}, Got: ${threadId} (may not be threaded)`
          );
        }
      }

      // Log if they're the same (normal for new threads)
      if (messageId === threadId && !params.threadHeaders?.threadId) {
        this.logger.debug(
          `Note: Message ID and Thread ID are the same (new thread created): ${messageId}`,
        );
      }

      return {
        id: messageId,
        threadId: threadId,
        labelIds: result.data.labelIds || [],
        gmailMessageId: gmailMessageId || undefined, // Actual Message-ID from Gmail headers
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to send email to ${params.to}: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Refresh an expired OAuth2 access token
   */
  async refreshAccessToken(
    encryptedRefreshToken: string,
    clientId: string,
    clientSecret: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const refreshToken = await this.cryptoUtilityService.decrypt(
        encryptedRefreshToken,
      );

      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'postmessage', // redirect URI for refresh
      );

      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();

      this.logger.log('Access token refreshed successfully');

      return {
        accessToken: credentials.access_token,
        expiresIn: credentials.expiry_date
          ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
          : 3600,
      };
    } catch (error) {
      const err = error as Error;
      const errorMessage = err.message.toLowerCase();
      
      // Check if this is a refresh token failure (not just access token failure)
      if (
        errorMessage.includes('invalid_grant') ||
        errorMessage.includes('invalid refresh token') ||
        errorMessage.includes('refresh token expired') ||
        errorMessage.includes('refresh token revoked') ||
        errorMessage.includes('token has been expired or revoked') ||
        (errorMessage.includes('invalid_request') && errorMessage.includes('refresh'))
      ) {
        this.logger.error(
          `Refresh token is invalid/expired/revoked. User must re-authenticate: ${err.message}`,
          err.stack,
        );
        // Create a specific error that indicates refresh token failure
        const refreshTokenError = new Error(
          `Refresh token invalid/expired/revoked: ${err.message}. User must re-authenticate.`,
        );
        refreshTokenError.name = 'RefreshTokenError';
        throw refreshTokenError;
      }
      
      this.logger.error(`Failed to refresh access token: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Validate an OAuth2 token
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      await oauth2.userinfo.get();

      return true;
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`Token validation failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Create a MIME email message in base64 format
   */
  private createMessage(
    to: string,
    from: string,
    subject: string,
    html: string | undefined,
    fromName?: string,
    text?: string | undefined,
    threadHeaders?: {
      inReplyTo?: string;
      references?: string;
      threadId?: string;
    },
  ): string {
    const boundary = '----=_Part_' + Date.now();
    
    // Format From header with name if provided
    const fromHeader = fromName 
      ? `From: ${this.encodeHeaderName(fromName)} <${from}>`
      : `From: ${from}`;
    
    // Log the From header for debugging
    if (fromName) {
      this.logger.debug(`📧 [FROM HEADER] Using: "${fromHeader}"`);
    } else {
      this.logger.debug(`📧 [FROM HEADER] No display name, using: "${fromHeader}"`);
    }
    
    // Build email headers
    const headers: string[] = [
      `To: ${to}`,
      fromHeader,
      `Subject: ${this.encodeHeaderName(subject)}`,
      'MIME-Version: 1.0',
    ];

    // Add thread headers if provided (for replying in same thread)
    // Reference approach: In-Reply-To: <${parentMessageId}> and References: <${parentMessageId}>
    // threadHeaders.inReplyTo and threadHeaders.references should already be wrapped as <messageId>
    if (threadHeaders) {
      if (threadHeaders.inReplyTo) {
        // Reference: In-Reply-To: <${parentMessageId}>
        // Should already be wrapped from email-sender.processor
        headers.push(`In-Reply-To: ${threadHeaders.inReplyTo}`);
        this.logger.debug(`📧 [THREAD HEADERS] In-Reply-To: ${threadHeaders.inReplyTo}`);
      }
      if (threadHeaders.references) {
        // Reference: References: <${parentMessageId}>
        // Should already be wrapped from email-sender.processor
        headers.push(`References: ${threadHeaders.references}`);
        this.logger.debug(`📧 [THREAD HEADERS] References: ${threadHeaders.references.substring(0, 100)}...`);
      }
      // Note: threadId is passed in requestBody, not as header (Gmail API requirement)
      // We don't add Thread-Id header - it's passed as threadId parameter in sendEmail
    }
    
    // Determine content type based on what's provided
    const hasText = text && text.trim().length > 0;
    const hasHtml = html && html.trim().length > 0;

    if (!hasText && !hasHtml) {
      throw new Error('Either HTML or text content must be provided');
    }

    // If only one format is provided, use simple content type
    if (hasText && !hasHtml) {
      // Text-only email
      let message = [
        ...headers,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 7bit',
        '',
        text,
      ].join('\r\n');
      return Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    } else if (hasHtml && !hasText) {
      // HTML-only email
      let message = [
        ...headers,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 7bit',
        '',
        html,
      ].join('\r\n');
      return Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    } else {
      // Both formats provided - use multipart/alternative
      let message = [
        ...headers,
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
      ].join('\r\n');

      // Add plain text part first (clients prefer HTML if both are present)
      if (text) {
        message += [
          `--${boundary}`,
          'Content-Type: text/plain; charset=UTF-8',
          'Content-Transfer-Encoding: 7bit',
          '',
          text,
          '',
        ].join('\r\n');
      }

      // Add HTML part
      if (html) {
        message += [
          `--${boundary}`,
          'Content-Type: text/html; charset=UTF-8',
          'Content-Transfer-Encoding: 7bit',
          '',
          html,
          '',
          `--${boundary}--`,
        ].join('\r\n');
      }

      // Encode to base64url (Gmail API expects base64url encoding)
      // Reference: Replace + with -, / with _, and remove trailing =
      // This matches the reference code's encodeBase64Url function
      return Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }
  }

  /**
   * Get real Message-ID from Gmail after sending
   * Reference: Fetch Message-ID using format: 'full', clean it (remove < >), return clean
   */
  async getRealMessageId(gmail: any, internalId: string): Promise<string> {
    try {
      // Wait a moment for Gmail to process the message
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use format: 'full' to get Message-ID (more reliable)
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: internalId,
        format: 'full',
      });

      // Find Message-ID in headers (case-insensitive)
      const header = msg.data.payload?.headers?.find(
        (h: any) => h.name && h.name.toLowerCase() === 'message-id'
      )?.value;

      if (!header) {
        this.logger.warn(`⚠️ [GMAIL MESSAGE-ID] Message-ID header not found in Gmail response`);
        // Fallback: use internal ID as clean ID
        return internalId;
      }

      // Clean: remove < > brackets for storage
      const cleanMessageId = header.replace(/[<>]/g, '');
      this.logger.log(`📧 [GMAIL MESSAGE-ID] Fetched and cleaned Message-ID: ${cleanMessageId} (original: ${header})`);
      return cleanMessageId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.warn(`⚠️ [GMAIL MESSAGE-ID] Could not fetch real Message-ID, using internal ID as fallback: ${errorMessage}`);
      // Last-resort fallback: use internal ID
      return internalId;
    }
  }

  /**
   * Get raw message for logging (without encoding)
   */
  private getRawMessageForLogging(
    to: string,
    from: string,
    subject: string,
    html: string,
    fromName?: string,
    text?: string,
    threadHeaders?: {
      inReplyTo?: string;
      references?: string;
      threadId?: string;
    },
  ): string {
    const boundary = '----=_Part_' + Date.now();
    
    // Format From header with name if provided
    const fromHeader = fromName 
      ? `From: ${this.encodeHeaderName(fromName)} <${from}>`
      : `From: ${from}`;
    
    // Build email headers
    const headers: string[] = [
      `To: ${to}`,
      fromHeader,
      `Subject: ${this.encodeHeaderName(subject)}`,
      'MIME-Version: 1.0',
    ];

    // Add thread headers if provided
    if (threadHeaders) {
      if (threadHeaders.inReplyTo) {
        headers.push(`In-Reply-To: ${threadHeaders.inReplyTo}`);
      }
      if (threadHeaders.references) {
        headers.push(`References: ${threadHeaders.references}`);
      }
    }
    
    let message = [
      ...headers,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
    ].join('\r\n');

    // Add plain text part if provided
    if (text) {
      message += [
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 7bit',
        '',
        text,
        '',
      ].join('\r\n');
    }

    // Add HTML part
    message += [
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      html,
      '',
      `--${boundary}--`,
    ].join('\r\n');

    return message;
  }

  /**
   * Encode header name to RFC 2047 format if it contains non-ASCII characters
   */
  private encodeHeaderName(name: string): string {
    // Check if name contains non-ASCII characters
    if (/^[\x00-\x7F]*$/.test(name)) {
      // All ASCII, no encoding needed
      return name;
    }
    
    // Encode to RFC 2047 format (example: =?UTF-8?B?...?=)
    // For simplicity, we'll use base64 encoding
    return `=?UTF-8?B?${Buffer.from(name, 'utf-8').toString('base64')}?=`;
  }

  /**
   * Parse Gmail API error to determine if it's permanent or temporary
   */
  isTemporaryError(error: any): boolean {
    const temporaryCodes = [
      'RATE_LIMIT_EXCEEDED',
      'QUOTA_EXCEEDED',
      'BACKEND_ERROR',
      'UNAVAILABLE',
    ];

    const errorCode = error?.code || error?.response?.data?.error?.code;
    const errorMessage = error?.message || '';

    return (
      temporaryCodes.some(code => errorMessage.includes(code)) ||
      errorCode === 429 || // Too many requests
      errorCode === 500 || // Internal server error
      errorCode === 503    // Service unavailable
    );
  }

  /**
   * Parse error to get a user-friendly error code
   */
  getErrorCode(error: any): string {
    if (error?.code) {
      return error.code.toString();
    }

    if (error?.response?.data?.error?.code) {
      return error.response.data.error.code.toString();
    }

    if (error?.message) {
      // Extract error type from message
      if (error.message.includes('invalid_grant')) return 'INVALID_GRANT';
      if (error.message.includes('invalid_email')) return 'INVALID_EMAIL';
      if (error.message.includes('recipient_blocked')) return 'RECIPIENT_BLOCKED';
      if (error.message.includes('rate_limit')) return 'RATE_LIMIT_EXCEEDED';
    }

    return 'UNKNOWN_ERROR';
  }

  /**
   * List messages from Gmail inbox (for polling bounce emails)
   */
  async listMessages(
    accessToken: string,
    labelIds: string[] = ['INBOX', 'SPAM'], // Check both inbox and spam
    maxResults: number = 50,
    query?: string, // Optional Gmail search query
  ): Promise<{ messages: Array<{ id: string; threadId: string }>; nextPageToken?: string }> {
    try {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Build query for bounce emails
      const searchQuery = query || 'in:inbox OR in:spam';

      const result = await gmail.users.messages.list({
        userId: 'me',
        labelIds,
        maxResults,
        q: searchQuery,
      });

      const messages =
        result.data.messages?.map((msg) => ({
          id: msg.id!,
          threadId: msg.threadId!,
        })) || [];

      return {
        messages,
        nextPageToken: result.data.nextPageToken || undefined,
      };
    } catch (error) {
      const err = error as Error;
      // Check if this is a scope-related error (don't log as error, let caller handle)
      if (err.message.includes('Metadata scope') || err.message.includes('scope')) {
        // Re-throw as-is for caller to handle gracefully
        throw error;
      }
      this.logger.error(
        `Failed to list Gmail messages: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Get full message details from Gmail
   */
  async getMessage(
    accessToken: string,
    messageId: string,
  ): Promise<{
    id: string;
    threadId: string;
    snippet: string;
    payload: any;
    headers: Array<{ name: string; value: string }>;
    internalDate: string;
    labelIds: string[];
  }> {
    try {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const result = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const rawHeaders = result.data.payload?.headers || [];
      // Map Gmail API headers to our format, filtering out any null/undefined
      const headers = rawHeaders
        .filter((h): h is { name: string; value: string } => 
          !!h && typeof h.name === 'string' && typeof h.value === 'string'
        )
        .map((h) => ({ name: h.name!, value: h.value! }));

      return {
        id: result.data.id!,
        threadId: result.data.threadId!,
        snippet: result.data.snippet || '',
        payload: result.data.payload,
        headers,
        internalDate: result.data.internalDate || '',
        labelIds: result.data.labelIds || [],
      };
    } catch (error) {
      const err = error as Error;
      // Check if this is a scope-related error (don't log as error, let caller handle)
      if (err.message.includes('Metadata scope') || err.message.includes('scope')) {
        // Re-throw as-is for caller to handle gracefully
        throw error;
      }
      this.logger.error(
        `Failed to get Gmail message ${messageId}: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Get message body text (extracts from payload)
   */
  extractMessageBody(payload: any): string {
    let body = '';

    const extractPart = (part: any) => {
      if (part.body?.data) {
        try {
          const decoded = Buffer.from(part.body.data, 'base64').toString('utf-8');
          if (part.mimeType === 'text/plain') {
            body += decoded + ' ';
          } else if (part.mimeType === 'text/html') {
            // Strip HTML tags for parsing
            const textOnly = decoded.replace(/<[^>]*>/g, ' ');
            body += textOnly + ' ';
          }
        } catch (e) {
          // Skip invalid base64
        }
      }

      if (part.parts) {
        part.parts.forEach((subPart: any) => extractPart(subPart));
      }
    };

    if (payload.parts) {
      payload.parts.forEach((part: any) => extractPart(part));
    } else if (payload.body?.data) {
      try {
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      } catch (e) {
        // Skip invalid base64
      }
    }

    return body.trim();
  }

  /**
   * Get Gmail thread by thread ID (for reply detection)
   */
  async getThread(
    accessToken: string,
    threadId: string,
  ): Promise<{
    id: string;
    historyId: string;
    messages: Array<{
      id: string;
      threadId: string;
      snippet: string;
      payload: any;
      headers: Array<{ name: string; value: string }>;
      internalDate: string;
      labelIds: string[];
    }>;
  }> {
    try {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const result = await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'full',
      });

      const messages = (result.data.messages || []).map((msg) => {
        const rawHeaders = msg.payload?.headers || [];
        // Map Gmail API headers to our format, filtering out any null/undefined
        const headers = rawHeaders
          .filter((h): h is { name: string; value: string } => 
            !!h && typeof h.name === 'string' && typeof h.value === 'string'
          )
          .map((h) => ({ name: h.name!, value: h.value! }));
        
        return {
          id: msg.id!,
          threadId: msg.threadId!,
          snippet: msg.snippet || '',
          payload: msg.payload,
          headers,
          internalDate: msg.internalDate || '',
          labelIds: msg.labelIds || [],
        };
      });

      return {
        id: result.data.id!,
        historyId: result.data.historyId || '',
        messages,
      };
    } catch (error) {
      const err = error as Error;
      // Check if this is a scope-related error (don't log as error, let caller handle)
      if (err.message.includes('Metadata scope') || err.message.includes('scope') || err.message.includes('format FULL')) {
        // Re-throw as-is for caller to handle gracefully
        throw error;
      }
      this.logger.error(
        `Failed to get Gmail thread ${threadId}: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * List threads for a user (for finding threads with replies)
   */
  async listThreads(
    accessToken: string,
    query?: string,
    maxResults: number = 50,
  ): Promise<{
    threads: Array<{ id: string; snippet: string; historyId: string }>;
    nextPageToken?: string;
  }> {
    try {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const result = await gmail.users.threads.list({
        userId: 'me',
        maxResults,
        q: query,
      });

      const threads =
        result.data.threads?.map((thread) => ({
          id: thread.id!,
          snippet: thread.snippet || '',
          historyId: thread.historyId || '',
        })) || [];

      return {
        threads,
        nextPageToken: result.data.nextPageToken || undefined,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to list Gmail threads: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * List Gmail history (changes) since a specific historyId
   * Used for incremental processing to reduce API calls
   * 
   * @param accessToken Gmail OAuth access token
   * @param startHistoryId History ID to start from (exclusive)
   * @param labelId Optional single label ID to filter by (Gmail API uses singular)
   * @param maxResults Maximum number of history records to return
   * @returns History records with message and thread IDs that changed
   */
  async listHistory(
    accessToken: string,
    startHistoryId: string,
    labelId?: string,
    maxResults: number = 100,
  ): Promise<{
    history: Array<{
      id: string;
      messagesAdded?: Array<{ message: { id: string; threadId: string } }>;
      messagesDeleted?: Array<{ message: { id: string; threadId: string } }>;
      labelsAdded?: Array<{ message: { id: string; threadId: string }; labelIds: string[] }>;
      labelsRemoved?: Array<{ message: { id: string; threadId: string }; labelIds: string[] }>;
    }>;
    historyId: string;
    nextPageToken?: string;
  }> {
    try {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const params: any = {
        userId: 'me',
        startHistoryId,
        maxResults,
      };

      // Only add labelId if provided (Gmail API uses singular labelId)
      if (labelId) {
        params.labelId = labelId;
      }

      const result = await gmail.users.history.list(params);

      const history = (result.data.history || []).map((h) => ({
        id: h.id || '',
        messagesAdded: h.messagesAdded?.map((ma) => ({
          message: {
            id: ma.message?.id || '',
            threadId: ma.message?.threadId || '',
          },
        })),
        messagesDeleted: h.messagesDeleted?.map((md) => ({
          message: {
            id: md.message?.id || '',
            threadId: md.message?.threadId || '',
          },
        })),
        labelsAdded: h.labelsAdded?.map((la) => ({
          message: {
            id: la.message?.id || '',
            threadId: la.message?.threadId || '',
          },
          labelIds: la.labelIds || [],
        })),
        labelsRemoved: h.labelsRemoved?.map((lr) => ({
          message: {
            id: lr.message?.id || '',
            threadId: lr.message?.threadId || '',
          },
          labelIds: lr.labelIds || [],
        })),
      }));

      return {
        history,
        historyId: result.data.historyId || startHistoryId,
        nextPageToken: result.data.nextPageToken,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to list Gmail history from ${startHistoryId}: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Get current historyId for a user's mailbox
   * Used to initialize history tracking
   */
  async getCurrentHistoryId(accessToken: string): Promise<string> {
    try {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Get profile to retrieve current historyId
      const profile = await gmail.users.getProfile({
        userId: 'me',
      });

      return profile.data.historyId || '';
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to get current historyId: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }
}

