import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/stores';
import { organizationService } from '@/api';

/**
 * Hook to get organization timezone
 * First tries to get from store cache, then fetches from API if not cached
 * Returns the timezone of the user's organization
 * Falls back to UTC if not available
 * Automatically updates when cache is cleared/updated
 */
export function useOrganizationTimezone(): string {
  const { user, selectedOrganizationId, getOrganizationFromCache, setOrganizationCache, organizationsCache } = useAppStore();
  const [timezone, setTimezone] = useState<string>('UTC');

  // Determine which organization ID to use
  const orgId = useMemo(() => selectedOrganizationId || user?.organizationId, [selectedOrganizationId, user?.organizationId]);

  // Check cache synchronously on every render (for immediate updates when cache changes)
  const cachedOrg = useMemo(() => {
    if (!orgId) return null;
    return getOrganizationFromCache(orgId);
  }, [orgId, getOrganizationFromCache, organizationsCache]); // Include organizationsCache to react to cache changes

  useEffect(() => {
    const fetchTimezone = async () => {
      try {
        if (!orgId) {
          setTimezone('UTC');
          return;
        }

        // First, try to get from cache (check synchronously)
        if (cachedOrg && cachedOrg.timezone) {
          setTimezone(cachedOrg.timezone);
          return;
        }

        // If not in cache, fetch from API
        const response = await organizationService.getOrganization(orgId);
        
        if (response.success && response.data) {
          const orgTimezone = response.data.timezone || 'UTC';
          
          // Cache the organization data for future use
          setOrganizationCache(orgId, {
            id: orgId,
            timezone: orgTimezone,
            name: response.data.name,
          });
          
          setTimezone(orgTimezone);
        } else {
          setTimezone('UTC');
        }
      } catch (error) {
        console.error('Failed to fetch organization timezone:', error);
        setTimezone('UTC');
      }
    };

    fetchTimezone();
  }, [orgId, cachedOrg, setOrganizationCache]); // Include cachedOrg to react when cache updates

  // Update timezone immediately if cache changes (synchronous check)
  useEffect(() => {
    if (cachedOrg && cachedOrg.timezone) {
      setTimezone(cachedOrg.timezone);
    } else if (!orgId) {
      setTimezone('UTC');
    }
  }, [cachedOrg, orgId]);

  return timezone;
}
