import { Organization } from 'src/resources/organizations/entities/organization.entity';
import { createOrganizationEntity, createInactiveOrganization, createSuspendedOrganization } from '../../utils/test-factories';

// Helper to create an Organization instance with methods
const createOrgInstance = (data: Partial<Organization>): Organization => {
  const org = Object.create(Organization.prototype);
  Object.assign(org, data);
  return org;
};

describe('Organization Entity', () => {
  describe('isActive', () => {
    it('should return true for ACTIVE status', () => {
      const org = createOrgInstance(createOrganizationEntity({ status: 'ACTIVE' }));
      expect(org.isActive()).toBe(true);
    });

    it('should return false for INACTIVE status', () => {
      const org = createOrgInstance(createOrganizationEntity({ status: 'INACTIVE' }));
      expect(org.isActive()).toBe(false);
    });

    it('should return false for SUSPENDED status', () => {
      const org = createOrgInstance(createOrganizationEntity({ status: 'SUSPENDED' }));
      expect(org.isActive()).toBe(false);
    });
  });

  describe('canBeDeleted', () => {
    it('should return false for ACTIVE organization', () => {
      const org = createOrgInstance(createOrganizationEntity({ status: 'ACTIVE' }));
      expect(org.canBeDeleted()).toBe(false);
    });

    it('should return false for SUSPENDED organization', () => {
      const org = createOrgInstance(createOrganizationEntity({ status: 'SUSPENDED' }));
      expect(org.canBeDeleted()).toBe(false);
    });

    it('should return false for INACTIVE organization with recent activity', () => {
      const org = createOrgInstance(createOrganizationEntity({
        status: 'INACTIVE',
        updatedAt: new Date().toISOString(), // Recent activity
      }));
      expect(org.canBeDeleted()).toBe(false);
    });

    it('should return true for INACTIVE organization with old activity', () => {
      const org = createOrgInstance(createInactiveOrganization());
      expect(org.canBeDeleted()).toBe(true);
    });

    it('should return true for INACTIVE organization exactly 30 days old (boundary - can delete)', () => {
      // Logic: if updatedAt > thirtyDaysAgo, return false. So exactly 30 days means NOT >, so can delete
      const exactly30DaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const org = createOrgInstance(createOrganizationEntity({
        status: 'INACTIVE',
        updatedAt: exactly30DaysAgo.toISOString(),
      }));
      expect(org.canBeDeleted()).toBe(true);
    });

    it('should return false for INACTIVE organization 29 days old (just below boundary - cannot delete)', () => {
      // 29 days ago is MORE recent than 30 days ago, so updatedAt > thirtyDaysAgo is true
      const twentyNineDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
      const org = createOrgInstance(createOrganizationEntity({
        status: 'INACTIVE',
        updatedAt: twentyNineDaysAgo.toISOString(),
      }));
      expect(org.canBeDeleted()).toBe(false);
    });

    it('should return true for INACTIVE organization 31 days old (just above boundary - can delete)', () => {
      // 31 days ago is LESS recent than 30 days ago, so updatedAt > thirtyDaysAgo is false
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      const org = createOrgInstance(createOrganizationEntity({
        status: 'INACTIVE',
        updatedAt: thirtyOneDaysAgo.toISOString(),
      }));
      expect(org.canBeDeleted()).toBe(true);
    });
  });

  describe('canBeSuspended', () => {
    it('should return true for ACTIVE organization', () => {
      const org = createOrgInstance(createOrganizationEntity({ status: 'ACTIVE' }));
      expect(org.canBeSuspended()).toBe(true);
    });

    it('should return true for INACTIVE organization', () => {
      const org = createOrgInstance(createOrganizationEntity({ status: 'INACTIVE' }));
      expect(org.canBeSuspended()).toBe(true);
    });

    it('should return false for SUSPENDED organization', () => {
      const org = createOrgInstance(createSuspendedOrganization());
      expect(org.canBeSuspended()).toBe(false);
    });
  });

  describe('updateSettings', () => {
    it('should merge new settings with existing settings', () => {
      const org = createOrgInstance(createOrganizationEntity({
        settings: { key1: 'value1', key2: 'value2' },
      }));
      
      org.updateSettings({ key2: 'updated', key3: 'value3' });
      
      expect(org.settings).toEqual({
        key1: 'value1',
        key2: 'updated',
        key3: 'value3',
      });
    });

    it('should create settings object if it does not exist', () => {
      const org = createOrgInstance(createOrganizationEntity({ settings: null }));
      org.updateSettings({ newKey: 'newValue' });
      
      expect(org.settings).toEqual({ newKey: 'newValue' });
    });
  });

  describe('getDisplayName', () => {
    it('should return name if available', () => {
      const org = createOrgInstance(createOrganizationEntity({ name: 'Test Org' }));
      expect(org.getDisplayName()).toBe('Test Org');
    });

    it('should return slug if name is not available', () => {
      const org = createOrgInstance(createOrganizationEntity({ name: null, slug: 'test-org' }));
      expect(org.getDisplayName()).toBe('test-org');
    });
  });

  describe('hasBillingInfo', () => {
    it('should return true if billingEmail exists', () => {
      const org = createOrgInstance(createOrganizationEntity({ billingEmail: 'billing@test.com' }));
      expect(org.hasBillingInfo()).toBe(true);
    });

    it('should return true if email exists', () => {
      const org = createOrgInstance(createOrganizationEntity({ email: 'contact@test.com' }));
      expect(org.hasBillingInfo()).toBe(true);
    });

    it('should return false if neither email exists', () => {
      const org = createOrgInstance(createOrganizationEntity({ billingEmail: null, email: null }));
      expect(org.hasBillingInfo()).toBe(false);
    });
  });

  describe('getPrimaryEmail', () => {
    it('should return billingEmail if available', () => {
      const org = createOrgInstance(createOrganizationEntity({
        billingEmail: 'billing@test.com',
        email: 'contact@test.com',
      }));
      expect(org.getPrimaryEmail()).toBe('billing@test.com');
    });

    it('should return email if billingEmail is not available', () => {
      const org = createOrgInstance(createOrganizationEntity({
        billingEmail: null,
        email: 'contact@test.com',
      }));
      expect(org.getPrimaryEmail()).toBe('contact@test.com');
    });

    it('should return null if neither email exists', () => {
      const org = createOrgInstance(createOrganizationEntity({ billingEmail: null, email: null }));
      expect(org.getPrimaryEmail()).toBeNull();
    });
  });

  describe('hasCompleteAddress', () => {
    it('should return true if all address fields are present', () => {
      const org = createOrgInstance(createOrganizationEntity({
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country',
        postalCode: '12345',
      }));
      expect(org.hasCompleteAddress()).toBe(true);
    });

    it('should return false if any address field is missing', () => {
      const org = createOrgInstance(createOrganizationEntity({
        address: '123 Test St',
        city: 'Test City',
        state: null,
        country: 'Test Country',
        postalCode: '12345',
      }));
      expect(org.hasCompleteAddress()).toBe(false);
    });
  });

  describe('getFullAddress', () => {
    it('should return formatted address if complete', () => {
      const org = createOrgInstance(createOrganizationEntity({
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country',
        postalCode: '12345',
      }));
      
      expect(org.getFullAddress()).toBe('123 Test St, Test City, Test State 12345, Test Country');
    });

    it('should return empty string if address is incomplete', () => {
      const org = createOrgInstance(createOrganizationEntity({
        address: '123 Test St',
        city: null,
      }));
      
      expect(org.getFullAddress()).toBe('');
    });
  });
});

