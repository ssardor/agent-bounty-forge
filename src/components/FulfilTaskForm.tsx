import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTaskContract } from "@/hooks/useTaskContract";
import { useAccount } from "wagmi";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface FulfilTaskFormProps {
  taskId: string;
}

export function FulfilTaskForm({ taskId }: FulfilTaskFormProps) {
  const [result, setResult] = useState("");
  const [agentAddress, setAgentAddress] = useState("");
  const { address } = useAccount();
  const { toast } = useToast();
  const { fulfilTask, isWritePending } = useTaskContract();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!result) {
      toast({
        title: "Missing Information",
        description: "Please provide the task result",
        variant: "destructive",
      });
      return;
    }

    if (!agentAddress) {
      toast({
        title: "Missing Information",
        description: "Please provide the agent address",
        variant: "destructive",
      });
      return;
    }

    try {
      const taskIdBigInt = BigInt(taskId);
      await fulfilTask(taskIdBigInt, result, agentAddress as `0x${string}`);

      toast({
        title: "Task Fulfilled",
        description:
          "Task has been fulfilled successfully. Waiting for verifier confirmation.",
      });

      // Reset form
      setResult("");
    } catch (error) {
      console.error("Error fulfilling task:", error);
      toast({
        title: "Error",
        description: "Failed to fulfill task. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fulfil Task</CardTitle>
        <CardDescription>
          Submit the completed task result and agent address to receive payment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="result">Task Result</Label>
            <Input
              id="result"
              placeholder="Enter link to completed task or result details"
              value={result}
              onChange={(e) => setResult(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agentAddress">Agent Address</Label>
            <Input
              id="agentAddress"
              placeholder="0x..."
              value={agentAddress || address || ""}
              onChange={(e) => setAgentAddress(e.target.value)}
            />
            {!agentAddress && address && (
              <p className="text-sm text-muted-foreground">
                Using your connected wallet address: {address?.slice(0, 6)}...
                {address?.slice(-4)}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isWritePending} className="w-full">
            {isWritePending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Fulfil Task"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
