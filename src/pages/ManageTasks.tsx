import { useState, useEffect } from "react";
import { TaskCard } from "@/components/TaskCard";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useTonTaskContract } from "@/hooks/useTonTaskContract";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { shortenAddress, cleanUpErrorMessage } from "@/lib/utils";

interface Task {
  id: string;
  description: string;
  bounty: string;
  conditions: string;
  status: "active" | "completed" | "cancelled";
  timestamp?: Date;
}

interface OperationResult {
  success: boolean;
  title: string;
  description: string;
  taskId?: string;
  error?: string;
}

const STORAGE_KEY = "agent-task-history";
const MANAGE_STORAGE_KEY = "agent-manage-tasks";

// Mock data for additional demo tasks
const initialDemoTasks: Task[] = [
  {
    id: "demo-1",
    description: "Analyze sentiment of 1000 customer reviews",
    bounty: "50",
    conditions:
      "Provide detailed sentiment analysis report with accuracy > 90%",
    status: "active",
  },
  {
    id: "demo-2",
    description: "Generate product descriptions for 50 items",
    bounty: "30",
    conditions: "SEO-optimized descriptions, 100-150 words each",
    status: "active",
  },
  {
    id: "demo-3",
    description: "Classify images into 20 categories",
    bounty: "40",
    conditions: "Process 500 images with 95% accuracy threshold",
    status: "completed",
  },
];

export default function ManageTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [operationResult, setOperationResult] =
    useState<OperationResult | null>(null);
  const { toast } = useToast();
  const {
    cancelTask,
    completeTask,
    isWritePending,
    isTransactionLoading,
    isTransactionSuccess,
    isTransactionError,
    transactionError,
    userAddress,
  } = useTonTaskContract();

  // Load tasks from localStorage and created tasks
  useEffect(() => {
    try {
      // Load created tasks from CreateTask page
      const createdTasks = localStorage.getItem(STORAGE_KEY);
      const manageTasks = localStorage.getItem(MANAGE_STORAGE_KEY);

      let allTasks: Task[] = [...initialDemoTasks];

      if (createdTasks) {
        const parsedCreated = JSON.parse(createdTasks);
        const createdWithStatus = parsedCreated.map(
          (task: Omit<Task, "status">) => ({
            ...task,
            status: "active" as const,
            timestamp: new Date(task.timestamp),
          })
        );
        allTasks = [...allTasks, ...createdWithStatus];
      }

      if (manageTasks) {
        const parsedManage = JSON.parse(manageTasks);
        // Update status from manage tasks storage
        allTasks = allTasks.map((task) => {
          const managedTask = parsedManage.find(
            (mt: Task) => mt.id === task.id
          );
          return managedTask ? { ...task, status: managedTask.status } : task;
        });
      }

      setTasks(allTasks);
    } catch (error) {
      console.error("Failed to load tasks from localStorage:", error);
      setTasks(initialDemoTasks);
    }
  }, []);

  // Save task status changes to localStorage
  const saveTaskStatus = (updatedTasks: Task[]) => {
    try {
      const taskStatuses = updatedTasks.map(({ id, status }) => ({
        id,
        status,
      }));
      localStorage.setItem(MANAGE_STORAGE_KEY, JSON.stringify(taskStatuses));
    } catch (error) {
      console.error("Failed to save task status to localStorage:", error);
    }
  };

  // Handle transaction status changes for cancel operations
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);

  useEffect(() => {
    if (isTransactionSuccess && pendingCancelId) {
      // Transaction was successful, update local state
      const updatedTasks = tasks.map((task) =>
        task.id === pendingCancelId
          ? { ...task, status: "cancelled" as const }
          : task
      );
      setTasks(updatedTasks);
      saveTaskStatus(updatedTasks);

      // Show success modal
      const task = tasks.find((t) => t.id === pendingCancelId);
      setOperationResult({
        success: true,
        title: "Task Cancelled Successfully!",
        description:
          "Your task has been cancelled and TON refunded to your wallet.",
        taskId: pendingCancelId,
      });
      setShowResultModal(true);

      setPendingCancelId(null);
    } else if (isTransactionError && pendingCancelId) {
      // Transaction failed
      setOperationResult({
        success: false,
        title: "Task Cancellation Failed",
        description: "Transaction was rejected or failed. Task remains active.",
        taskId: pendingCancelId,
        error: transactionError?.message
          ? cleanUpErrorMessage(transactionError.message)
          : "Unknown error occurred",
      });
      setShowResultModal(true);
      setPendingCancelId(null);
    }
  }, [
    isTransactionSuccess,
    isTransactionError,
    pendingCancelId,
    transactionError,
  ]);

  const handleCancelTask = async (id: string) => {
    // Check if wallet is connected
    if (!userAddress) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to cancel a task",
        variant: "destructive",
      });
      return;
    }

    try {
      // Set pending cancel ID
      setPendingCancelId(id);

      // First, call the contract to cancel the task
      await cancelTask(id);
    } catch (error) {
      console.error("Error cancelling task:", error);
      setOperationResult({
        success: false,
        title: "Error",
        description: "Failed to initiate task cancellation. Please try again.",
        taskId: id,
        error:
          error instanceof Error
            ? cleanUpErrorMessage(error.message)
            : cleanUpErrorMessage(String(error)),
      });
      setShowResultModal(true);
      setPendingCancelId(null);
    }
  };

  // Handle transaction status changes for complete operations
  const [pendingCompleteId, setPendingCompleteId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (isTransactionSuccess && pendingCompleteId) {
      // Transaction was successful, update local state
      const updatedTasks = tasks.map((task) =>
        task.id === pendingCompleteId
          ? { ...task, status: "completed" as const }
          : task
      );
      setTasks(updatedTasks);
      saveTaskStatus(updatedTasks);

      // Show success modal
      const task = tasks.find((t) => t.id === pendingCompleteId);
      setOperationResult({
        success: true,
        title: "Task Completed Successfully!",
        description: "Task marked as completed. Agent payment released!",
        taskId: pendingCompleteId,
      });
      setShowResultModal(true);

      setPendingCompleteId(null);
    } else if (isTransactionError && pendingCompleteId) {
      // Transaction failed
      setOperationResult({
        success: false,
        title: "Task Completion Failed",
        description: "Transaction was rejected or failed. Task remains active.",
        taskId: pendingCompleteId,
        error: transactionError?.message
          ? cleanUpErrorMessage(transactionError.message)
          : "Unknown error occurred",
      });
      setShowResultModal(true);
      setPendingCompleteId(null);
    }
  }, [
    isTransactionSuccess,
    isTransactionError,
    pendingCompleteId,
    transactionError,
  ]);

  const handleCompleteTask = async (id: string) => {
    // Check if wallet is connected
    if (!userAddress) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to complete a task",
        variant: "destructive",
      });
      return;
    }

    try {
      // Set pending complete ID
      setPendingCompleteId(id);

      // First, call the contract to complete the task
      await completeTask(id);
    } catch (error) {
      console.error("Error completing task:", error);
      setOperationResult({
        success: false,
        title: "Error",
        description: "Failed to initiate task completion. Please try again.",
        taskId: id,
        error:
          error instanceof Error
            ? cleanUpErrorMessage(error.message)
            : cleanUpErrorMessage(String(error)),
      });
      setShowResultModal(true);
      setPendingCompleteId(null);
    }
  };

  const clearAllTasks = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(MANAGE_STORAGE_KEY);
      setTasks([]);
      toast({
        title: "All Tasks Cleared",
        description: "Task history has been cleared.",
      });
    } catch (error) {
      console.error("Failed to clear tasks:", error);
    }
  };

  const closeModal = () => {
    setShowResultModal(false);
    setOperationResult(null);
  };

  const activeTasks = tasks.filter((t) => t.status === "active");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const cancelledTasks = tasks.filter((t) => t.status === "cancelled");

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Result Modal */}
      <Dialog open={showResultModal} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              {operationResult?.success ? (
                <CheckCircle className="h-12 w-12 text-green-500" />
              ) : (
                <XCircle className="h-12 w-12 text-red-500" />
              )}
            </div>
            <DialogTitle className="text-center">
              {operationResult?.title}
            </DialogTitle>
            <DialogDescription className="text-center">
              {operationResult?.description}
            </DialogDescription>
          </DialogHeader>

          {operationResult && (
            <div className="space-y-4">
              {operationResult.success ? (
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
                          {operationResult.taskId}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700 dark:text-green-300">
                          Status:
                        </span>
                        <span className="font-medium text-green-600">
                          {operationResult.title.includes("Cancelled")
                            ? "Cancelled"
                            : "Completed"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    {operationResult.title.includes("Cancelled")
                      ? "TON has been refunded to your wallet."
                      : "Agent payment has been released."}
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
                    <p className="text-sm text-red-700 dark:text-red-300 break-words whitespace-pre-wrap">
                      {operationResult.error}
                    </p>
                  </div>
                  <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/20 p-4">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                      Possible Causes
                    </h4>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
                      <li>Transaction rejected by user</li>
                      <li>Insufficient permissions</li>
                      <li>Network connection issues</li>
                      <li>Smart contract error</li>
                      <li>Gas fee issues</li>
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex justify-center pt-2">
                <Button onClick={closeModal} className="w-full">
                  {operationResult.success ? "Continue" : "Try Again"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Manage Tasks</h1>
          <p className="text-muted-foreground">
            Monitor and manage your marketplace tasks
          </p>
        </div>
        {tasks.length > 0 && (
          <Button
            variant="outline"
            onClick={clearAllTasks}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Tasks
          </Button>
        )}
      </div>

      {activeTasks.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">
            Active Tasks ({activeTasks.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {activeTasks.map((task) => (
              <TaskCard
                key={task.id}
                id={task.id}
                description={task.description}
                bounty={task.bounty}
                conditions={task.conditions}
                status={task.status}
                onCancel={handleCancelTask}
                onComplete={handleCompleteTask}
                isWritePending={isWritePending || isTransactionLoading}
              />
            ))}
          </div>
        </section>
      )}

      {completedTasks.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">
            Completed Tasks ({completedTasks.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {completedTasks.map((task) => (
              <TaskCard
                key={task.id}
                id={task.id}
                description={task.description}
                bounty={task.bounty}
                conditions={task.conditions}
                status={task.status}
                isWritePending={isWritePending || isTransactionLoading}
              />
            ))}
          </div>
        </section>
      )}

      {cancelledTasks.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">
            Cancelled Tasks ({cancelledTasks.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {cancelledTasks.map((task) => (
              <TaskCard
                key={task.id}
                id={task.id}
                description={task.description}
                bounty={task.bounty}
                conditions={task.conditions}
                status={task.status}
                isWritePending={isWritePending || isTransactionLoading}
              />
            ))}
          </div>
        </section>
      )}

      {tasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No tasks yet. Create your first task to get started!</p>
        </div>
      )}
    </div>
  );
}
