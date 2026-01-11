export function extractEmailDomain(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2 || !parts[1]) {
    throw new Error('Invalid email format');
  }
  return parts[1];
}

export function removeTldFromDomain(domain: string): string {
  return domain.replace(
    /\.(com|org|net|edu|gov|co|io|info|biz|me|us|uk|ca|au|in|de|fr|jp|cn|br|ru|nl|es|it|se|ch|no|dk|fi|nz|be|at|pl|cz|ie|za|mx|sg|hk|tw|kr|th|my|id|vn|ph|pk|bd|ng|ke|eg|ma|tn|gh|ug|tz|zm|zw|ao|mz|bw|na|sn|ci|cm|ml|bf|ne|td|so|sd|ly|dz|et|er|dj|gm|gn|lr|sl|mr|cv|st|gq|ga|cg|cd|rw|bi)$/i,
    '',
  );
}

export function generateOrgSlugFromDomain(domain: string): string {
  return domain.toLowerCase().replace(/\./g, '-');
}

export function generateOrgNameFromDomain(domain: string): string {
  const domainWithoutExt = removeTldFromDomain(domain);
  return (
    domainWithoutExt.charAt(0).toUpperCase() +
    domainWithoutExt.slice(1).toLowerCase()
  );
}
