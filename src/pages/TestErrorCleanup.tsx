import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cleanUpErrorMessage } from "@/lib/utils";

const TestErrorCleanup = () => {
  const [testError, setTestError] = useState("");

  const sampleError = `Error Details User rejected the request.
Request Arguments:
  from:   0x5b3efcF25e14e4218F74B4a2aFAC5b2B091FceeE
  to:     0x340E7068e63d0fc65B63D37A12bd2D17735102D9
  data:   0x16c7280a000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000f424000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001310000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000013100000000000000000000000000000000000000000000000000000000000000

Contract Call:
  address:   0x340E7068e63d0fc65B63D37A12bd2D17735102D9
  function:  createTask(string description, uint256 bountyAmount, string conditions)
  args:      (1, 1000000, 1)
  sender:    0x5b3efcF25e14e4218F74B4a2aFAC5b2B091FceeE

Docs: https://viem.sh/docs/contract/writeContract
Details: MetaMask Tx Signature: User denied transaction signature.
Version: viem@2.37.9`;

  const handleTestCleanup = () => {
    const cleaned = cleanUpErrorMessage(sampleError);
    setTestError(cleaned);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Error Cleanup Test</h1>
        <p className="text-muted-foreground">
          Test the error message cleanup functionality
        </p>
      </div>

      <Card className="p-6 mb-6">
        <div className="space-y-4">
          <Button onClick={handleTestCleanup} className="w-full">
            Test Error Cleanup
          </Button>

          {testError && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Cleaned Error Message:</h3>
              <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap break-words">
                {testError}
              </pre>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default TestErrorCleanup;
