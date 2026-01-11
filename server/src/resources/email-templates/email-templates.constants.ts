
export const EMAIL_TEMPLATE_VARIABLE_FIELDS: readonly string[] = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'jobTitle',
  'company',
  'companyDomain',
  'companyWebsite',
  'companyIndustry',
  'companySize',
];

export const DEFAULT_EMAIL_TEMPLATE_CONTACT_DATA = {
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
} as const;


