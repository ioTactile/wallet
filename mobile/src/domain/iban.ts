export function maskIban(iban: string): string {
  const compact = iban.replace(/\s/g, '');
  if (compact.length <= 8) {
    return compact;
  }
  return `${compact.slice(0, 4)} •••• ${compact.slice(-4)}`;
}
