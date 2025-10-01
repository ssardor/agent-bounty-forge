// Contract addresses and configuration
export const CONTRACT_ADDRESSES = {
  polygon: {
    TaskRegistry: "0x340E7068e63d0fc65B63D37A12bd2D17735102D9" as `0x${string}`,
  },
};

// Deployer and verifier address
export const VERIFIER_ADDRESS = "0x4B2e08de7Ae347eD78802e0B1d6626438C224C70";

// USDC contract address on Polygon
export const USDC_CONTRACT_ADDRESS =
  "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

// Chain ID for Polygon
export const POLYGON_CHAIN_ID = 137;

// RPC URL for Polygon
export const POLYGON_RPC_URL = "https://polygon-rpc.com";

// Export ABI
export { default as ITaskRegistryABI } from "./ITaskRegistry.json";
