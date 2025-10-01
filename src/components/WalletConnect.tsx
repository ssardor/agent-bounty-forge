import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { Badge } from "@/components/ui/badge";

export function WalletConnect() {
  const { isConnected, chain } = useAccount();

  return (
    <div className="flex items-center gap-2">
      {isConnected && chain && (
        <Badge variant="secondary" className="text-xs">
          {chain.name}
        </Badge>
      )}
      <ConnectButton
        showBalance={false}
        chainStatus="icon"
        accountStatus={"avatar"}
      />
    </div>
  );
}
