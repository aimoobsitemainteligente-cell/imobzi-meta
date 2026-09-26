export function maskName(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    const first = parts[0];
    if (first.length <= 1) return first;
    return first[0] + '***';
  }
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first[0]}*** ${last}`;
}
