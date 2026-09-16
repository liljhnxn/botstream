/**
 * Helper abstraction for BotNS (Bot Name Service) identity resolution.
 * Ready for future on-chain BotNS resolver integration.
 */
export function resolveIdentity(address: string | undefined): { name: string; isBotNS: boolean } {
  if (!address) return { name: "Unknown", isBotNS: false };

  // Future BotNS integration will query the BotNS registry contract.
  // Until then, transparently return the shortened address.
  const shortened = `${address.slice(0, 6)}...${address.slice(-4)}`;
  return {
    name: shortened,
    isBotNS: false,
  };
}

export function formatAddress(address: string | undefined): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatBOT(amountWei: bigint | string | number | undefined): string {
  if (amountWei === undefined || amountWei === null) return "0";
  try {
    const val = typeof amountWei === "bigint" ? amountWei : BigInt(amountWei);
    const whole = val / 10n ** 18n;
    const remainder = val % 10n ** 18n;
    const decimal = remainder.toString().padStart(18, "0").slice(0, 4);
    const cleanDecimal = decimal.replace(/0+$/, "");
    return cleanDecimal ? `${whole}.${cleanDecimal}` : `${whole}`;
  } catch {
    return "0";
  }
}

export function formatInterval(seconds: bigint | number): string {
  const sec = Number(seconds);
  const days = Math.floor(sec / 86400);
  if (days >= 365 && days % 365 === 0) {
    const years = days / 365;
    return `${years} Year${years > 1 ? "s" : ""}`;
  }
  if (days >= 30 && days % 30 === 0) {
    const months = days / 30;
    return `${months} Month${months > 1 ? "s" : ""}`;
  }
  if (days >= 7 && days % 7 === 0) {
    const weeks = days / 7;
    return `${weeks} Week${weeks > 1 ? "s" : ""}`;
  }
  if (days > 0) {
    return `${days} Day${days > 1 ? "s" : ""}`;
  }
  const hours = Math.floor(sec / 3600);
  if (hours > 0) {
    return `${hours} Hour${hours > 1 ? "s" : ""}`;
  }
  return `${sec}s`;
}
