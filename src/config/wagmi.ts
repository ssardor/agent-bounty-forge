import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, polygon, optimism, arbitrum, base } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Agent Task Marketplace",
  projectId:
    import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ||
    "0123456789abcdef0123456789abcdef01234567", // Get this from WalletConnect Cloud
  chains: [mainnet, polygon, optimism, arbitrum, base],
  ssr: false,
});
