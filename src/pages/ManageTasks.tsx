import { useState } from "react";
import { TaskCard } from "@/components/TaskCard";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  description: string;
  bounty: string;
  conditions: string;
  status: "active" | "completed" | "cancelled";
}

// Mock data
const initialTasks: Task[] = [
  {
    id: "1",
    description: "Analyze sentiment of 1000 customer reviews",
    bounty: "50",
    conditions: "Provide detailed sentiment analysis report with accuracy > 90%",
    status: "active",
  },
  {
    id: "2",
    description: "Generate product descriptions for 50 items",
    bounty: "30",
    conditions: "SEO-optimized descriptions, 100-150 words each",
    status: "active",
  },
  {
    id: "3",
    description: "Classify images into 20 categories",
    bounty: "40",
    conditions: "Process 500 images with 95% accuracy threshold",
    status: "completed",
  },
];

export default function ManageTasks() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const { toast } = useToast();

  const handleCancelTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, status: "cancelled" as const } : task
    ));
    
    toast({
      title: "Task Cancelled",
      description: "Smart contract called: cancelTask(). USDC refunded to your wallet.",
    });
  };

  const activeTasks = tasks.filter(t => t.status === "active");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const cancelledTasks = tasks.filter(t => t.status === "cancelled");

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Manage Tasks</h1>
        <p className="text-muted-foreground">
          Monitor and manage your marketplace tasks
        </p>
      </div>

      {activeTasks.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Active Tasks</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {activeTasks.map(task => (
              <TaskCard key={task.id} {...task} onCancel={handleCancelTask} />
            ))}
          </div>
        </section>
      )}

      {completedTasks.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Completed Tasks</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {completedTasks.map(task => (
              <TaskCard key={task.id} {...task} />
            ))}
          </div>
        </section>
      )}

      {cancelledTasks.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Cancelled Tasks</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {cancelledTasks.map(task => (
              <TaskCard key={task.id} {...task} />
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
