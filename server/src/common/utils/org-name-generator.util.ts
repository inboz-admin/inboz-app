/**
 * Generates a random organization name following cloud resource naming patterns
 * Format: {prefix}-{adjective}-{identifier}
 * Similar to cloud resource names like: org-apex-abc123, company-quantum-001
 */
export function generateRandomOrgName(): string {
  // Organization and company-related prefixes
  const prefixes = [
    'org', 'company', 'corp', 'enterprise', 'business', 'firm', 'group',
    'holdings', 'ventures', 'partners', 'associates', 'alliance', 'collective',
    'network', 'syndicate', 'consortium', 'conglomerate', 'establishment',
    'institution', 'foundation', 'organization', 'corporation', 'entity'
  ];

  // 50+ unique and dashing adjectives (all unique, no duplicates)
  const adjectives = [
    // Power & Excellence
    'apex', 'quantum', 'nexus', 'velocity', 'synergy', 'catalyst', 'pinnacle',
    'horizon', 'summit', 'vortex', 'momentum', 'zenith', 'aurora', 'nova',
    'stellar', 'dynamic', 'elite', 'prime', 'core', 'vertex', 'fusion',
    'genesis', 'pulse', 'echo', 'phoenix', 'titan', 'vanguard', 'frontier',
    'odyssey', 'legacy', 'thunder', 'blaze', 'storm',
    // Precious Materials
    'titanium', 'platinum', 'diamond', 'crystal', 'silver', 'gold', 'iron',
    'steel', 'magnum', 'imperial', 'royal', 'crown',
    // Gemstones & Minerals
    'emerald', 'sapphire', 'ruby', 'onyx', 'jade', 'amber', 'ivory', 'pearl',
    'coral', 'topaz', 'garnet', 'obsidian', 'marble', 'granite', 'basalt',
    'quartz', 'opal', 'agate', 'citrine', 'amethyst', 'peridot', 'zircon',
    'tourmaline', 'spinel', 'tanzanite', 'alexandrite', 'moonstone', 'sunstone',
    'labradorite', 'malachite', 'turquoise', 'lapis', 'carnelian', 'jasper',
    // Cosmic & Celestial
    'eclipse', 'comet', 'nebula', 'cosmic', 'lunar', 'solar', 'galactic',
    'celestial', 'meteor', 'asteroid', 'constellation', 'supernova', 'pulsar',
    'quasar', 'singularity', 'infinity', 'eternity',
    // Transformation & Evolution
    'transcend', 'ascend', 'evolve', 'transform', 'revolution', 'renaissance',
    'revelation', 'enlightenment', 'awakening', 'resurgence', 'revival',
    'rebirth', 'reformation'
  ];

  // Generate random identifier (alphanumeric, 4-6 characters)
  const generateIdentifier = (): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const length = Math.floor(Math.random() * 3) + 4; // 4-6 characters
    let identifier = '';
    for (let i = 0; i < length; i++) {
      identifier += chars[Math.floor(Math.random() * chars.length)];
    }
    return identifier;
  };

  // Get random components
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const identifier = generateIdentifier();

  // Format: prefix-adjective-identifier (cloud resource style)
  return `${prefix}-${adjective}-${identifier}`;
}

