import { v4 as uuidv4 } from 'uuid';
import { Organization } from 'src/resources/organizations/entities/organization.entity';
import { Transaction } from 'sequelize';

/**
 * Generates a unique UUID-based slug for organizations
 * Format: org-{uuid}
 * 
 * @param transaction Optional transaction for database queries
 * @param maxRetries Maximum number of retry attempts if slug collision occurs
 * @returns A unique slug string
 */
export async function generateUniqueOrgSlug(
  transaction?: Transaction,
  maxRetries: number = 5
): Promise<string> {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    const uuid = uuidv4();
    const slug = `org-${uuid}`;
    
    // Check if slug already exists
    const existing = await Organization.findOne({
      where: { slug },
      transaction,
    });
    
    if (!existing) {
      return slug;
    }
    
    attempts++;
  }
  
  // If all retries failed, throw error (extremely unlikely with UUID)
  throw new Error(`Failed to generate unique organization slug after ${maxRetries} attempts`);
}

