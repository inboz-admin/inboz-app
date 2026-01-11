// Utility functions for element components

const DEFAULT_PREVIEW_DATA = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  jobTitle: 'Software Engineer',
  company: 'Acme Corp',
  companyDomain: 'acme.com',
  companyWebsite: 'https://acme.com',
  companyIndustry: 'Technology',
  companySize: '50-100',
};

export const replaceVariables = (
  content: string, 
  previewData: Record<string, string> = DEFAULT_PREVIEW_DATA
): string => {
  if (!content) return content;
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return previewData[key] || match;
  });
};


