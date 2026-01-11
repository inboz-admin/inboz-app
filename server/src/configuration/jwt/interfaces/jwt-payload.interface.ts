import { UserRole } from 'src/common/enums/roles.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  type?: 'user' | 'employee';
  organizationId?: string;
  // selectedOrganizationId removed - organization filtering for employees now handled via query parameters
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  organization?: {
    id: string;
    name?: string;
    slug?: string;
    domain?: string;
  };
  iat?: number;
  exp?: number;
}
