import { IsOptional, IsObject } from 'class-validator';

export class EmailTemplatePreviewDto {
  @IsOptional()
  @IsObject()
  contactData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
    company?: string;
    companyDomain?: string;
    companyWebsite?: string;
    companyIndustry?: string;
    companySize?: string;
  };
}
