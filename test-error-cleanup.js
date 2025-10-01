// Simple test for error message cleanup
function shortenAddress(address, start = 6, end = 4) {
  if (!address) return "";
  if (!address.startsWith("0x") || address.length < start + end) {
    return address || "";
  }
  return `${address.substring(0, start)}...${address.substring(
    address.length - end
  )}`;
}

function shortenAddressesInError(errorMessage) {
  const addressRegex = /0x[a-fA-F0-9]{40}/g;
  return errorMessage.replace(addressRegex, (match) => {
    return shortenAddress(match, 6, 4);
  });
}

function cleanUpErrorMessage(errorMessage) {
  // First shorten addresses
  let cleanedMessage = shortenAddressesInError(errorMessage);

  // Handle the specific long data line format from the error message
  const longDataLineRegex = /data:\s*0x[a-fA-F0-9]{50,}/g;
  cleanedMessage = cleanedMessage.replace(longDataLineRegex, (match) => {
    // For very long data lines, truncate and show a cleaner version
    if (match.length > 50) {
      return "data: 0x...[truncated]...";
    }
    return match;
  });

  // Also handle multi-line data fields that continue on the next line
  const multiLineDataRegex = /(data:\s*0x[a-fA-F0-9]*\n\s*)[a-fA-F0-9\s]+/g;
  cleanedMessage = cleanedMessage.replace(
    multiLineDataRegex,
    (match, prefix) => {
      return prefix + "...[truncated]...";
    }
  );

  return cleanedMessage;
}

const testError = `User rejected the request.

Request Arguments:

  from:  0x5b3efcF25e14e4218F74B4a2aFAC5b2B091FceeE

  to:    0x340E7068e63d0fc65B63D37A12bd2D17735102D9

  data:  0x16c7ac90000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000f424000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001310000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000013100000000000000000000000000000000000000000000000000000000000000

Contract Call:

  address:   0x340E7068e63d0fc65B63D37A12bd2D17735102D9

  function:  createTask(string description, uint256 bountyAmount, string conditions)

  args:                (1, 1000000, 1)

  sender:    0x5b3efcF25e14e4218F74B4a2aFAC5b2B091FceeE

Docs: https://viem.sh/docs/contract/writeContract

Details: MetaMask Tx Signature: User denied transaction signature.

Version: viem@2.37.9`;

console.log("Original error:");
console.log(testError);
console.log("\n\nCleaned error:");
console.log(cleanUpErrorMessage(testError));
