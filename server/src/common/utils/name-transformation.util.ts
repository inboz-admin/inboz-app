/**
 * Name transformation utility
 * Capitalizes the first letter of each word in a name string
 */
export function capitalizeName(value: string): string {
  if (typeof value !== 'string') {
    return value;
  }
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

