import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortenAddress(
  address: string | undefined | null,
  start: number = 6,
  end: number = 4
): string {
  if (!address) return "";
  // Check for TON address format (starts with EQ, UQ, or kQ)
  if (
    (address.startsWith("EQ") ||
      address.startsWith("UQ") ||
      address.startsWith("kQ")) &&
    address.length > start + end
  ) {
    return `${address.substring(0, start)}...${address.substring(
      address.length - end
    )}`;
  }
  // Check for Ethereum address format
  if (address.startsWith("0x") && address.length >= start + end) {
    return `${address.substring(0, start)}...${address.substring(
      address.length - end
    )}`;
  }
  return address || "";
}

export function shortenString(str: string | undefined | null): string {
  if (!str) return "";
  if (str.length <= 6) {
    return str;
  }
  return `${str.substring(0, 3)}...${str.substring(str.length - 3)}`;
}

export function shortenTxHash(hash: string | undefined | null): string {
  if (!hash) return "";
  // Check for TON hash format
  if (
    (hash.startsWith("EQ") || hash.startsWith("UQ") || hash.startsWith("kQ")) &&
    hash.length > 6
  ) {
    return `${hash.substring(0, 3)}...${hash.substring(hash.length - 3)}`;
  }
  // Check for Ethereum hash format
  if (hash.startsWith("0x") && hash.length > 6) {
    return `${hash.substring(0, 3)}...${hash.substring(hash.length - 3)}`;
  }
  return shortenString(hash);
}

export function shortenAddressesInError(errorMessage: string): string {
  // TON address regex (EQ, UQ, or kQ followed by 48 alphanumeric characters)
  const tonAddressRegex = /[E|U|k]Q[A-Za-z0-9]{48}/g;
  // Ethereum address regex
  const ethAddressRegex = /0x[a-fA-F0-9]{40}/g;

  return errorMessage
    .replace(tonAddressRegex, (match) => shortenAddress(match, 6, 4))
    .replace(ethAddressRegex, (match) => shortenAddress(match, 6, 4));
}

export function cleanUpErrorMessage(errorMessage: string): string {
  // First shorten addresses
  let cleanedMessage = shortenAddressesInError(errorMessage);

  // Split into lines and filter out data lines and contract call sections
  const lines = cleanedMessage.split("\n");
  let inContractCallSection = false;
  const filteredLines = lines.filter((line) => {
    const trimmedLine = line.trim();

    // Check if we're entering or leaving a Contract Call section
    if (trimmedLine === "Contract Call:") {
      inContractCallSection = true;
      return false; // Remove the "Contract Call:" line itself
    }

    // Check if we're leaving the Contract Call section
    if (inContractCallSection && trimmedLine === "") {
      inContractCallSection = false;
      return false; // Remove the blank line after the section
    }

    // Skip lines while in Contract Call section
    if (inContractCallSection) {
      return false;
    }

    // Remove data lines
    if (trimmedLine.startsWith("data:")) {
      return false;
    }

    return true;
  });

  // Join the lines back together
  cleanedMessage = filteredLines.join("\n");

  // Clean up extra blank lines
  while (cleanedMessage.includes("\n\n\n")) {
    cleanedMessage = cleanedMessage.replace("\n\n\n", "\n\n");
  }

  return cleanedMessage;
}
