import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function TestTonConnect() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">TON Connect Test</h1>
        <p className="text-muted-foreground">
          Test the TON Connect functionality
        </p>
      </div>

      <Card className="p-6 mb-6">
        <div className="space-y-4">
          {wallet ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">Connected Wallet</h2>
              <p className="mb-2">Wallet Address: {wallet.account.address}</p>
              <p className="mb-4">Wallet App: {wallet.device.appName}</p>
              <Button
                onClick={() => tonConnectUI.disconnect()}
                variant="destructive"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold mb-4">Connect Wallet</h2>
              <p className="text-muted-foreground mb-4">
                Click the button below to connect your TON wallet
              </p>
              <Button onClick={() => tonConnectUI.openModal()}>
                Connect TON Wallet
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
