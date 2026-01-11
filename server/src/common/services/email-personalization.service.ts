import { Injectable, Logger } from '@nestjs/common';
import { Contact } from 'src/resources/contacts/entities/contact.entity';

export interface PersonalizedContent {
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class EmailPersonalizationService {
  private readonly logger = new Logger(EmailPersonalizationService.name);

  /**
   * Personalize email content by replacing variables with contact data
   */
  personalizeContent(
    subject: string,
    htmlContent: string,
    textContent: string,
    contact: Contact,
  ): PersonalizedContent {
    const personalizedSubject = this.replaceVariables(subject, contact);
    const personalizedHtml = this.replaceVariables(htmlContent, contact);
    const personalizedText = this.replaceVariables(textContent, contact);

    return {
      subject: personalizedSubject,
      html: personalizedHtml,
      text: personalizedText,
    };
  }

  /**
   * Replace {{variable}} patterns with contact data
   */
  private replaceVariables(content: string, contact: Contact): string {
    if (!content) return '';

    let result = content;

    // Define variable mappings
    const variableMap: Record<string, any> = {
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      jobTitle: contact.jobTitle,
      website: contact.website,
      city: contact.city,
      state: contact.state,
      country: contact.country,
      department: contact.department,
      industry: contact.industry,
      linkedin: contact.linkedin,
      twitter: contact.twitter,
      facebook: contact.facebook,
      companyDomain: contact.companyDomain,
      companyWebsite: contact.companyWebsite,
      companyIndustry: contact.companyIndustry,
      companySize: contact.companySize,
      companyRevenue: contact.companyRevenue,
    };

    // Replace each variable
    for (const [key, value] of Object.entries(variableMap)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      result = result.replace(regex, value || '');
    }

    // Log if there are still unreplaced variables
    const remainingVariables = result.match(/{{[^}]+}}/g);
    if (remainingVariables && remainingVariables.length > 0) {
      this.logger.warn(
        `Unreplaced variables found in content for contact ${contact.email}: ${remainingVariables.join(', ')}`,
      );
    }

    return result;
  }

  /**
   * Extract all variables from content
   */
  extractVariables(content: string): string[] {
    if (!content) return [];

    const matches = content.match(/{{[^}]+}}/g);
    if (!matches) return [];

    // Extract variable names without {{ }}
    return matches.map(match => 
      match.replace(/[{}]/g, '').trim()
    ).filter((v, i, arr) => arr.indexOf(v) === i); // Remove duplicates
  }

  /**
   * Validate that all variables in content exist in contact
   */
  validateVariables(
    subject: string,
    htmlContent: string,
    textContent: string,
    contact: Contact,
  ): { isValid: boolean; missingVariables: string[] } {
    // Extract all variables from all content
    const subjectVars = this.extractVariables(subject);
    const htmlVars = this.extractVariables(htmlContent);
    const textVars = this.extractVariables(textContent);

    const allVariables = [
      ...new Set([...subjectVars, ...htmlVars, ...textVars]),
    ];

    // Check which variables are missing in contact
    const validVariables = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'company',
      'jobTitle',
      'website',
      'city',
      'state',
      'country',
      'department',
      'industry',
      'linkedin',
      'twitter',
      'facebook',
      'companyDomain',
      'companyWebsite',
      'companyIndustry',
      'companySize',
      'companyRevenue',
    ];

    const missingVariables = allVariables.filter(
      variable => !validVariables.includes(variable),
    );

    return {
      isValid: missingVariables.length === 0,
      missingVariables,
    };
  }

  /**
   * Get a list of available variables for documentation
   */
  getAvailableVariables(): string[] {
    return [
      'firstName',
      'lastName',
      'email',
      'phone',
      'company',
      'jobTitle',
      'website',
      'city',
      'state',
      'country',
      'department',
      'industry',
      'linkedin',
      'twitter',
      'facebook',
      'companyDomain',
      'companyWebsite',
      'companyIndustry',
      'companySize',
      'companyRevenue',
    ];
  }
}

