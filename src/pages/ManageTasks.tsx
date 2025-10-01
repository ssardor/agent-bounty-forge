import { useState, useEffect } from "react";
import { TaskCard } from "@/components/TaskCard";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useTaskContract } from "@/hooks/useTaskContract";
import { useAccount } from "wagmi";

interface Task {
  id: string;
  description: string;
  bounty: string;
  conditions: string;
  status: "active" | "completed" | "cancelled";
  timestamp?: Date;
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
  const { toast } = useToast();
  const { cancelTask, completeTask, isWritePending } = useTaskContract();
  const { isConnected, address } = useAccount();

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

  const handleCancelTask = async (id: string) => {
    // Check if wallet is connected
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to cancel a task",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert string ID to BigInt for contract call
      const taskId = BigInt(id);
      await cancelTask(taskId);

      // Update local state
      const updatedTasks = tasks.map((task) =>
        task.id === id ? { ...task, status: "cancelled" as const } : task
      );
      setTasks(updatedTasks);
      saveTaskStatus(updatedTasks);

      toast({
        title: "Task Cancelled",
        description:
          "Smart contract called: cancelTask(). USDC refunded to your wallet.",
      });
    } catch (error) {
      console.error("Error cancelling task:", error);
      toast({
        title: "Error",
        description: "Failed to cancel task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCompleteTask = async (id: string) => {
    // Check if wallet is connected
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to complete a task",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert string ID to BigInt for contract call
      const taskId = BigInt(id);
      await completeTask(taskId);

      // Update local state
      const updatedTasks = tasks.map((task) =>
        task.id === id ? { ...task, status: "completed" as const } : task
      );
      setTasks(updatedTasks);
      saveTaskStatus(updatedTasks);

      toast({
        title: "Task Completed",
        description: "Task marked as completed. Agent payment released!",
      });
    } catch (error) {
      console.error("Error completing task:", error);
      toast({
        title: "Error",
        description: "Failed to complete task. Please try again.",
        variant: "destructive",
      });
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

  const activeTasks = tasks.filter((t) => t.status === "active");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const cancelledTasks = tasks.filter((t) => t.status === "cancelled");

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
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
                isWritePending={isWritePending}
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
                isWritePending={isWritePending}
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
                isWritePending={isWritePending}
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
