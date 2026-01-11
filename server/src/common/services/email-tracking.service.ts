import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize } from 'sequelize';
import { EmailMessage, EmailMessageStatus } from 'src/resources/campaigns/entities/email-message.entity';
import { EmailTrackingEvent, EmailEventType } from 'src/resources/campaigns/entities/email-tracking-event.entity';
import { Campaign } from 'src/resources/campaigns/entities/campaign.entity';
import { CampaignStep } from 'src/resources/campaigns/entities/campaign-step.entity';
import { Contact } from 'src/resources/contacts/entities/contact.entity';
import { ContactListMember } from 'src/resources/contact-lists/entities/contact-list-member.entity';
import { CampaignsService } from 'src/resources/campaigns/campaigns.service';

export interface TrackingUrls {
  openPixelUrl: string;
  unsubscribeUrl: string;
  clickBaseUrl: string;
}

@Injectable()
export class EmailTrackingService {
  private readonly logger = new Logger(EmailTrackingService.name);

  constructor(
    @InjectModel(EmailTrackingEvent)
    private readonly emailTrackingEventModel: typeof EmailTrackingEvent,
    @InjectModel(EmailMessage)
    private readonly emailMessageModel: typeof EmailMessage,
    @InjectModel(Campaign)
    private readonly campaignModel: typeof Campaign,
    @InjectModel(CampaignStep)
    private readonly campaignStepModel: typeof CampaignStep,
    @InjectModel(ContactListMember)
    private readonly contactListMemberModel: typeof ContactListMember,
    @Inject(forwardRef(() => CampaignsService))
    private readonly campaignsService: CampaignsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate tracking URLs for an email message
   */
  generateTrackingUrls(emailMessageId: string): TrackingUrls {
    const baseUrl = this.configService.get('APP_URL') || 'http://localhost:4000';
    
    const urls = {
      openPixelUrl: `${baseUrl}/api/v1/tracking/open/${emailMessageId}`,
      unsubscribeUrl: `${baseUrl}/api/v1/tracking/unsubscribe/${emailMessageId}`,
      clickBaseUrl: `${baseUrl}/api/v1/tracking/click/${emailMessageId}`,
    };
    
    this.logger.debug(`📧 Generated tracking URLs for email ${emailMessageId}:`, urls);
    
    return urls;
  }

  /**
   * Inject tracking pixel and rewrite links in HTML
   */
  injectTracking(
    htmlContent: string,
    emailMessageId: string,
    trackOpens: boolean,
    trackClicks: boolean,
    fromName?: string,
    addUnsubscribe: boolean = true,
    unsubscribeReplyEnabled: boolean = false,
    unsubscribeCustomMessage?: string,
  ): string {
    const urls = this.generateTrackingUrls(emailMessageId);
    let trackedHtml = htmlContent;

    // Rewrite links for click tracking if enabled
    if (trackClicks) {
      // Match all <a href="..."> tags
      trackedHtml = trackedHtml.replace(
        /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["']([^>]*)>/gi,
        (match, url, rest) => {
          // Skip if already a tracking URL or mailto/telephone links
          if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#') || url.includes('/api/v1/tracking/')) {
            this.logger.debug(`📧 Skipping click tracking for link: ${url}`);
            return match;
          }
          
          // Encode the original URL
          const encodedUrl = encodeURIComponent(url);
          const trackingUrl = `${urls.clickBaseUrl}?url=${encodedUrl}`;
          this.logger.debug(`📧 Rewriting link: ${url} → ${trackingUrl}`);
          
          return `<a href="${trackingUrl}"${rest}>`;
        }
      );
    }

    // Add signature with unsubscribe link (always add if addUnsubscribe is true)
    if (addUnsubscribe) {
      if (fromName) {
        const signature = this.generateSignature(fromName, urls.unsubscribeUrl, unsubscribeReplyEnabled, unsubscribeCustomMessage);
        trackedHtml += signature;
      } else {
        // Add unsubscribe link even without fromName
        let unsubscribeFooter = `
      <br><br>
      <p style="font-size: 12px; color: #999;">
        <a href="${urls.unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
      </p>
    `;
        // Add custom reply message if enabled
        if (unsubscribeReplyEnabled && unsubscribeCustomMessage) {
          unsubscribeFooter += `
      <p style="font-size: 12px; color: #999;">
        Or reply with "${unsubscribeCustomMessage}" to unsubscribe
      </p>
    `;
        }
        trackedHtml += unsubscribeFooter;
      }
    } else if (unsubscribeReplyEnabled && unsubscribeCustomMessage) {
      // If unsubscribe link is disabled but custom reply is enabled, still add the message
      const customMessageFooter = `
      <br><br>
      <p style="font-size: 12px; color: #999;">
        Reply with "${unsubscribeCustomMessage}" to unsubscribe
      </p>
    `;
      trackedHtml += customMessageFooter;
    }

    // Inject tracking pixel at the END (after signature)
    if (trackOpens) {
      const pixelHtml = `<img src="${urls.openPixelUrl}" width="1" height="1" style="display:none !important;" alt="" />`;
      
      this.logger.debug(`📧 Injecting tracking pixel for email ${emailMessageId}: ${urls.openPixelUrl}`);
      
      // Try to inject before closing </body> tag
      if (trackedHtml.includes('</body>')) {
        trackedHtml = trackedHtml.replace('</body>', `${pixelHtml}</body>`);
        this.logger.debug(`📧 Pixel injected before </body> tag`);
      } else {
        // If no body tag, append to end
        trackedHtml += pixelHtml;
        this.logger.debug(`📧 Pixel appended to end (no </body> tag found)`);
      }
    }

    return trackedHtml;
  }

  /**
   * Inject click tracking into plain text content
   * Rewrites URLs to point to tracking redirect endpoint
   */
  injectTextTracking(
    textContent: string,
    emailMessageId: string,
    trackClicks: boolean,
    fromName?: string,
    addUnsubscribe: boolean = true,
    unsubscribeReplyEnabled: boolean = false,
    unsubscribeCustomMessage?: string,
  ): string {
    const urls = this.generateTrackingUrls(emailMessageId);
    let trackedText = textContent;

    // Rewrite URLs for click tracking if enabled
    if (trackClicks) {
      // Match URLs in text (http://, https://, www.)
      // This regex matches URLs that are not already tracking URLs
      trackedText = trackedText.replace(
        /(https?:\/\/[^\s]+|www\.[^\s]+)/gi,
        (match) => {
          // Skip if already a tracking URL or mailto/tel links
          if (match.includes('/api/v1/tracking/') || match.startsWith('mailto:') || match.startsWith('tel:')) {
            this.logger.debug(`📧 Skipping click tracking for URL: ${match}`);
            return match;
          }
          
          // Ensure URL has protocol
          const fullUrl = match.startsWith('http') ? match : `https://${match}`;
          
          // Encode the original URL
          const encodedUrl = encodeURIComponent(fullUrl);
          const trackingUrl = `${urls.clickBaseUrl}?url=${encodedUrl}`;
          this.logger.debug(`📧 Rewriting text URL: ${match} → ${trackingUrl}`);
          
          return trackingUrl;
        }
      );
    }

    // Add signature with unsubscribe link (always add if addUnsubscribe is true)
    if (addUnsubscribe) {
      if (fromName) {
        let signature = `\n\nBest regards,\n${fromName}\n\nUnsubscribe: ${urls.unsubscribeUrl}`;
        // Add custom reply message if enabled
        if (unsubscribeReplyEnabled && unsubscribeCustomMessage) {
          signature += `\nOr reply with "${unsubscribeCustomMessage}" to unsubscribe`;
        }
        trackedText += signature;
      } else {
        // Add unsubscribe link even without fromName
        trackedText += `\n\nUnsubscribe: ${urls.unsubscribeUrl}`;
        // Add custom reply message if enabled
        if (unsubscribeReplyEnabled && unsubscribeCustomMessage) {
          trackedText += `\nOr reply with "${unsubscribeCustomMessage}" to unsubscribe`;
        }
      }
    } else if (unsubscribeReplyEnabled && unsubscribeCustomMessage) {
      // If unsubscribe link is disabled but custom reply is enabled, still add the message
      trackedText += `\n\nReply with "${unsubscribeCustomMessage}" to unsubscribe`;
    }

    return trackedText;
  }

  /**
   * Generate email signature
   */
  private generateSignature(
    fromName: string,
    unsubscribeUrl: string,
    unsubscribeReplyEnabled: boolean = false,
    unsubscribeCustomMessage?: string,
  ): string {
    let signature = `
      <br><br>
      Best regards,<br>
      <strong>${fromName}</strong>
      <br><br>
      <p style="font-size: 12px; color: #999;">
        <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
      </p>
    `;
    
    // Add custom reply message if enabled
    if (unsubscribeReplyEnabled && unsubscribeCustomMessage) {
      signature += `
      <p style="font-size: 12px; color: #999;">
        Or reply with "${unsubscribeCustomMessage}" to unsubscribe
      </p>
    `;
    }
    
    return signature;
  }

  /**
   * Record a tracking event and update aggregates
   */
  async recordEvent(
    emailMessageId: string,
    eventType: EmailEventType,
    eventData?: {
      clickedUrl?: string;
      linkId?: string;
      userAgent?: string;
      ipAddress?: string;
      gmailMessageId?: string;
      snippet?: string;
      [key: string]: any; // Allow additional properties for event-specific data
    },
  ): Promise<void> {
    try {
      this.logger.log(`📊 Recording ${eventType} event for email ${emailMessageId}`);
      
      // Load email message with related data
      const emailMessage = await this.emailMessageModel.findByPk(emailMessageId, {
        include: [
          { model: Campaign, required: false },
          { model: CampaignStep, required: false },
          { model: Contact, required: false },
        ],
      });

      if (!emailMessage) {
        this.logger.error(`Email message ${emailMessageId} not found for tracking event`);
        return;
      }

      this.logger.debug(`Found email message: ID=${emailMessage.id}, Status=${emailMessage.status}, Campaign=${emailMessage.campaignId}, Step=${emailMessage.campaignStepId}`);

      // CRITICAL: Check for duplicate events BEFORE creating to prevent multiple counts
      // For REPLIED and BOUNCED events with gmailMessageId, check by gmailMessageId
      // For OPENED, CLICKED, and UNSUBSCRIBED, check if event already exists for this email
      if ((eventType === EmailEventType.REPLIED || eventType === EmailEventType.BOUNCED) && eventData?.gmailMessageId) {
        // Check if this exact Gmail message ID was already processed for this email
        const existingEvent = await this.emailTrackingEventModel.findOne({
          where: {
            emailMessageId,
            eventType,
            gmailMessageId: eventData.gmailMessageId,
          },
        });

        if (existingEvent) {
          this.logger.warn(
            `⚠️ Duplicate ${eventType} event detected for email ${emailMessageId} with gmailMessageId ${eventData.gmailMessageId}. Skipping creation to prevent duplicate counting.`,
          );
          return; // Skip creating duplicate event
        }
      } else if (eventType === EmailEventType.OPENED || eventType === EmailEventType.CLICKED || eventType === EmailEventType.UNSUBSCRIBED) {
        // Check if this event type already exists for this email message
        const existingEvent = await this.emailTrackingEventModel.findOne({
          where: {
            emailMessageId,
            eventType,
          },
        });

        if (existingEvent) {
          this.logger.warn(
            `⚠️ Duplicate ${eventType} event detected for email ${emailMessageId}. Skipping creation to prevent duplicate counting.`,
          );
          return; // Skip creating duplicate event
        }
      }

      // Create tracking event
      const event = await this.emailTrackingEventModel.create({
        emailMessageId,
        eventType,
        clickedUrl: eventData?.clickedUrl,
        linkId: eventData?.linkId,
        userAgent: eventData?.userAgent,
        ipAddress: eventData?.ipAddress,
        gmailMessageId: eventData?.gmailMessageId || null, // Store in dedicated column
        eventData: eventData ? {
          ...(eventData.snippet && { snippet: eventData.snippet }),
          ...(eventData.clickedUrl && { clickedUrl: eventData.clickedUrl }),
          ...(eventData.linkId && { linkId: eventData.linkId }),
          ...(eventData.bounceReason && { bounceReason: eventData.bounceReason }),
          ...(eventData.bounceType && { bounceType: eventData.bounceType }),
        } : null,
        occurredAt: new Date(),
      });

      this.logger.debug(`Created tracking event: ID=${event.id}, Type=${eventType}`);

      // Update email message aggregates based on event type
      const updateData: Partial<EmailMessage> = {};
      
      switch (eventType) {
        case EmailEventType.OPENED:
          updateData.openCount = (emailMessage.openCount || 0) + 1;
          if (!emailMessage.firstOpenedAt) {
            updateData.firstOpenedAt = new Date();
            updateData.openedAt = new Date();
          }
          updateData.lastOpenedAt = new Date();
          break;
        
        case EmailEventType.CLICKED:
          updateData.clickCount = (emailMessage.clickCount || 0) + 1;
          if (!emailMessage.firstClickedAt) {
            updateData.firstClickedAt = new Date();
            updateData.clickedAt = new Date();
          }
          updateData.lastClickedAt = new Date();
          break;
        
        case EmailEventType.BOUNCED:
          updateData.bouncedAt = new Date();
          break;
        
        case EmailEventType.REPLIED:
          updateData.replyCount = (emailMessage.replyCount || 0) + 1;
          if (!emailMessage.repliedAt) {
            updateData.repliedAt = new Date();
          }
          updateData.lastRepliedAt = new Date();
          break;
        
        case EmailEventType.COMPLAINED:
          updateData.complainedAt = new Date();
          break;
        
        case EmailEventType.UNSUBSCRIBED:
          updateData.unsubscribedAt = new Date();
          break;
      }

      if (Object.keys(updateData).length > 0) {
        await emailMessage.update(updateData);
        this.logger.debug(`Updated email message aggregates: ${JSON.stringify(updateData)}`);
      }

      // Update step and campaign aggregates
      if (emailMessage.campaignStep) {
        this.logger.debug(`Updating step aggregates for step ${emailMessage.campaignStepId}`);
        await this.updateStepAggregates(emailMessage.campaignStepId, eventType);
      }

      if (emailMessage.campaign) {
        this.logger.debug(`Updating campaign aggregates for campaign ${emailMessage.campaignId}`);
        await this.updateCampaignAggregates(emailMessage.campaignId, eventType);
      }

      // Update contact timestamps and counts
      if (emailMessage.contact) {
        const contactUpdateData: Partial<typeof emailMessage.contact> = {};
        
        switch (eventType) {
          case EmailEventType.OPENED:
            contactUpdateData.lastEmailOpenedAt = new Date();
            contactUpdateData.recentlyOpenDate = new Date();
            // Note: numberOfOpens is tracked separately, not incremented here per event
            break;
          case EmailEventType.CLICKED:
            contactUpdateData.lastEmailClickedAt = new Date();
            contactUpdateData.recentlyClickDate = new Date();
            // Note: numberOfClicks is tracked separately, not incremented here per event
            break;
          case EmailEventType.BOUNCED:
            // Bounce count and status are updated in bounce-detection.service.ts
            // This is a fallback in case bounce event is recorded via email-tracking.service
            contactUpdateData.bounceCount = (emailMessage.contact.bounceCount || 0) + 1;
            break;
          case EmailEventType.REPLIED:
            // Reply date is updated in reply-detection.service.ts
            // This is a fallback in case reply event is recorded via email-tracking.service
            contactUpdateData.recentlyReplyDate = new Date();
            contactUpdateData.lastContactedAt = new Date();
            break;
        }

        if (Object.keys(contactUpdateData).length > 0) {
          await emailMessage.contact.update(contactUpdateData);
          this.logger.debug(
            `Updated contact ${emailMessage.contactId} for ${eventType} event`,
          );
        }
      }

      this.logger.log(`✅ Successfully recorded ${eventType} event for email ${emailMessageId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to record tracking event: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Update step-level aggregates
   */
  private async updateStepAggregates(stepId: string, eventType: EmailEventType): Promise<void> {
    const step = await this.campaignStepModel.findByPk(stepId);
    if (!step) {
      this.logger.warn(`Step ${stepId} not found for aggregate update`);
      return;
    }

    // Count distinct email messages for this step (one event per email message)
    const count = await this.emailTrackingEventModel.count({
      where: {
        eventType,
      },
      include: [
        {
          model: EmailMessage,
          as: 'emailMessage',
          where: {
            campaignStepId: stepId,
          },
          required: true,
        },
      ],
      distinct: true,
      col: 'email_message_id',
    });

    const updateData: Partial<CampaignStep> = {};
    
    switch (eventType) {
      case EmailEventType.OPENED:
        updateData.emailsOpened = count;
        break;
      case EmailEventType.CLICKED:
        updateData.emailsClicked = count;
        break;
      case EmailEventType.BOUNCED:
        updateData.emailsBounced = count;
        break;
      case EmailEventType.COMPLAINED:
        updateData.emailsComplained = count;
        break;
      case EmailEventType.REPLIED:
        updateData.emailsReplied = count;
        break;
      case EmailEventType.UNSUBSCRIBED:
        updateData.unsubscribes = count;
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await step.update(updateData);
      this.logger.debug(`Updated step ${stepId} aggregates: ${JSON.stringify(updateData)}`);
    }
  }

  /**
   * Update campaign-level aggregates
   */
  private async updateCampaignAggregates(campaignId: string, eventType: EmailEventType): Promise<void> {
    const campaign = await this.campaignModel.findByPk(campaignId);
    if (!campaign) {
      this.logger.warn(`Campaign ${campaignId} not found for aggregate update`);
      return;
    }

    // Count distinct email messages for this campaign (one event per email message)
    const count = await this.emailTrackingEventModel.count({
      where: {
        eventType,
      },
      include: [
        {
          model: EmailMessage,
          as: 'emailMessage',
          where: {
            campaignId,
          },
          required: true,
        },
      ],
      distinct: true,
      col: 'email_message_id',
    });

    this.logger.debug(`Campaign ${campaignId} ${eventType} count: ${count}`);

    const updateData: Partial<Campaign> = {};
    
    switch (eventType) {
      case EmailEventType.OPENED:
        updateData.emailsOpened = count;
        break;
      case EmailEventType.CLICKED:
        updateData.emailsClicked = count;
        break;
      case EmailEventType.BOUNCED:
        updateData.emailsBounced = count;
        break;
      case EmailEventType.COMPLAINED:
        updateData.emailsComplained = count;
        break;
      case EmailEventType.REPLIED:
        updateData.emailsReplied = count;
        break;
      case EmailEventType.UNSUBSCRIBED:
        updateData.unsubscribes = count;
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await campaign.update(updateData);
      this.logger.debug(`Updated campaign ${campaignId} aggregates: ${JSON.stringify(updateData)}`);
    }
  }

  /**
   * Handle unsubscribe request
   */
  async handleUnsubscribe(emailMessageId: string): Promise<void> {
    try {
      this.logger.log(`🔔 Processing unsubscribe request for email ${emailMessageId}`);
      
      const emailMessage = await this.emailMessageModel.findByPk(emailMessageId, {
        include: [{ model: Contact, required: false }],
      });

      if (!emailMessage) {
        throw new Error(`Email message ${emailMessageId} not found`);
      }

      this.logger.debug(`Found email message: ID=${emailMessage.id}, ContactId=${emailMessage.contactId}`);

      // Mark contact as unsubscribed
      if (emailMessage.contact) {
        await emailMessage.contact.update({
          subscribed: false,
          unsubscribedAt: new Date(),
          // Note: subscribedAt cannot be null (NOT NULL constraint), so we keep the original subscription date
        });
        this.logger.log(`✅ Marked contact ${emailMessage.contactId} as unsubscribed`);
        
        // Note: We no longer update campaign totalRecipients when contacts unsubscribe
        // Progress is calculated dynamically from actual email records per step
        // The totalRecipients field remains as a historical snapshot but is not used for progress calculations
      } else {
        this.logger.warn(`No contact found for email message ${emailMessageId}`);
      }

      // Record unsubscribe event
      await this.recordEvent(emailMessageId, EmailEventType.UNSUBSCRIBED);

      this.logger.log(`✅ Successfully processed unsubscribe for email ${emailMessageId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ Failed to handle unsubscribe: ${err.message}`, err.stack);
      throw error;
    }
  }

}

