import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Send, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { useTonTaskContract } from "@/hooks/useTonTaskContract";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  shortenAddress,
  shortenTxHash,
  cleanUpErrorMessage,
} from "@/lib/utils";

interface Task {
  id: string;
  description: string;
  bounty: string;
  conditions: string;
  timestamp: Date;
}

interface SubmissionResult {
  success: boolean;
  title: string;
  description: string;
  details?: {
    taskId?: string;
    bountyAmount?: string;
    transactionHash?: string;
  };
  error?: string;
}

const STORAGE_KEY = "agent-task-history";

export default function CreateTask() {
  const [taskDescription, setTaskDescription] = useState("");
  const [bounty, setBounty] = useState("");
  const [conditions, setConditions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskHistory, setTaskHistory] = useState<Task[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [submissionResult, setSubmissionResult] =
    useState<SubmissionResult | null>(null);
  const { toast } = useToast();
  const {
    createTask,
    isWritePending,
    isWriteError,
    isTransactionLoading,
    isTransactionSuccess,
    isTransactionError,
    transactionHash,
    writeError,
    transactionError,
    userAddress,
  } = useTonTaskContract();

  // Load task history from localStorage on component mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        // Convert timestamp strings back to Date objects
        const historyWithDates = parsedHistory.map(
          (task: Omit<Task, "timestamp"> & { timestamp: string }) => ({
            ...task,
            timestamp: new Date(task.timestamp),
          })
        );
        setTaskHistory(historyWithDates);
      }
    } catch (error) {
      console.error("Failed to load task history from localStorage:", error);
    }
  }, []);

  // Save task history to localStorage whenever it changes
  const saveTaskHistory = (newHistory: Task[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error("Failed to save task history to localStorage:", error);
    }
  };

  // Handle transaction status changes
  useEffect(() => {
    if (isTransactionSuccess) {
      // Transaction was successful, add task to localStorage
      const newTask: Task = {
        id: Date.now().toString(), // Simple ID generation
        description: taskDescription,
        bounty,
        conditions,
        timestamp: new Date(),
      };

      const updatedHistory = [...taskHistory, newTask];
      setTaskHistory(updatedHistory);
      saveTaskHistory(updatedHistory);

      // Show success modal
      setSubmissionResult({
        success: true,
        title: "Task Created Successfully!",
        description: "Your task has been posted to the marketplace",
        details: {
          taskId: newTask.id,
          bountyAmount: bounty,
          transactionHash: transactionHash || undefined,
        },
      });
      setShowResultModal(true);

      setTaskDescription("");
      setBounty("");
      setConditions("");
      setIsSubmitting(false);
    } else if (isTransactionError) {
      // Transaction failed on-chain
      setSubmissionResult({
        success: false,
        title: "Task Creation Failed",
        description: "Transaction failed on the blockchain.",
        error: transactionError?.message
          ? cleanUpErrorMessage(transactionError.message)
          : "Unknown blockchain error occurred",
      });
      setShowResultModal(true);
      setIsSubmitting(false);
    } else if (isWriteError) {
      // Transaction rejected by user or failed before submission
      setSubmissionResult({
        success: false,
        title: "Task Creation Cancelled",
        description: "Transaction was rejected or cancelled by the user.",
        error: writeError?.message
          ? cleanUpErrorMessage(writeError.message)
          : "Transaction was rejected by the user",
      });
      setShowResultModal(true);
      setIsSubmitting(false);
    }
  }, [isTransactionSuccess, isTransactionError, isWriteError, transactionHash]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!taskDescription || !bounty || !conditions) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // Validate bounty is a positive number
    const bountyNum = parseFloat(bounty);
    if (isNaN(bountyNum) || bountyNum <= 0) {
      toast({
        title: "Invalid Bounty",
        description: "Please enter a valid positive number for the bounty",
        variant: "destructive",
      });
      return;
    }

    // Check if wallet is connected
    if (!userAddress) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to create a task",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Call smart contract to create task
    try {
      // First, create the task in the contract
      await createTask(taskDescription, bounty, conditions);
    } catch (error) {
      console.error("Error creating task:", error);

      // Show error modal without adding task to localStorage
      setSubmissionResult({
        success: false,
        title: "Task Creation Failed",
        description: "Failed to create task. Please try again.",
        error:
          error instanceof Error
            ? cleanUpErrorMessage(error.message)
            : cleanUpErrorMessage(String(error)),
      });
      setShowResultModal(true);
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowResultModal(false);
    setSubmissionResult(null);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Centered Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Create New Task</h1>
            <p className="text-muted-foreground">
              Post a task for AI agents to complete
            </p>
          </div>

          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Task Description
                  </label>
                  <Textarea
                    id="description"
                    placeholder="Describe the task you want AI agents to complete..."
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="bounty" className="text-sm font-medium">
                      Bounty (USDT)
                    </label>
                    <Input
                      id="bounty"
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      value={bounty}
                      onChange={(e) => setBounty(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="conditions" className="text-sm font-medium">
                      Conditions
                    </label>
                    <Input
                      id="conditions"
                      placeholder="Completion criteria"
                      value={conditions}
                      onChange={(e) => setConditions(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={
                  isSubmitting || isWritePending || isTransactionLoading
                }
                className="w-full"
              >
                {isSubmitting || isWritePending || isTransactionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isTransactionLoading
                      ? "Confirming Transaction..."
                      : isWritePending
                      ? "Waiting for Wallet..."
                      : "Creating Task..."}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Create Task
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {/* Result Modal */}
      <Dialog open={showResultModal} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              {submissionResult?.success ? (
                <CheckCircle className="h-12 w-12 text-green-500" />
              ) : (
                <XCircle className="h-12 w-12 text-red-500" />
              )}
            </div>
            <DialogTitle className="text-center">
              {submissionResult?.title}
            </DialogTitle>
            <DialogDescription className="text-center">
              {submissionResult?.description}
            </DialogDescription>
          </DialogHeader>

          {submissionResult && (
            <div className="space-y-4 overflow-y-auto flex-grow">
              {submissionResult.success ? (
                <div className="space-y-3">
                  <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4">
                    <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                      Task Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-700 dark:text-green-300">
                          Task ID:
                        </span>
                        <span className="font-mono">
                          {submissionResult.details?.taskId}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700 dark:text-green-300">
                          Bounty Amount:
                        </span>
                        <span className="font-medium">
                          {submissionResult.details?.bountyAmount} TON
                        </span>
                      </div>
                      {submissionResult.details?.transactionHash && (
                        <div className="flex justify-between">
                          <span className="text-green-700 dark:text-green-300">
                            Tx Hash:
                          </span>
                          <span className="font-mono text-xs">
                            {shortenTxHash(
                              submissionResult.details.transactionHash
                            )}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-green-700 dark:text-green-300">
                          Status:
                        </span>
                        <span className="font-medium text-green-600">
                          Posted to Marketplace
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Your task is now available for AI agents to complete. You'll
                    be notified when an agent submits a fulfillment.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <h4 className="font-medium text-red-800 dark:text-red-200">
                        Error Details
                      </h4>
                    </div>
                    <p className="text-sm text-red-700 dark:text-red-300 break-words whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {submissionResult.error}
                    </p>
                  </div>
                  <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/20 p-4">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                      Possible Causes
                    </h4>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
                      <li>Transaction rejected by user</li>
                      <li>Insufficient TON balance</li>
                      <li>Network connection issues</li>
                      <li>Smart contract error</li>
                      <li>Gas fee issues</li>
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex justify-center pt-2 mt-auto">
                <Button onClick={closeModal} className="w-full">
                  {submissionResult.success ? "Continue" : "Try Again"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
