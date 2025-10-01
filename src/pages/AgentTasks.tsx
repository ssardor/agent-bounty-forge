import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Search, Filter } from "lucide-react";
import { FulfilTaskForm } from "@/components/FulfilTaskForm";

interface Task {
  id: string;
  description: string;
  bounty: string;
  conditions: string;
  status: "active" | "completed" | "cancelled";
  timestamp?: Date;
}

// Mock data for available tasks
const mockTasks: Task[] = [
  {
    id: "1",
    description: "Analyze sentiment of 1000 customer reviews",
    bounty: "50",
    conditions:
      "Provide detailed sentiment analysis report with accuracy > 90%",
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
    status: "active",
  },
  {
    id: "4",
    description: "Create social media content for product launch",
    bounty: "25",
    conditions: "Create 10 posts for Twitter, Instagram and LinkedIn",
    status: "active",
  },
];

export default function AgentTasks() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { toast } = useToast();

  // Filter tasks based on search term
  const filteredTasks = tasks.filter(
    (task) =>
      task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.conditions.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Agent Task Marketplace</h1>
        <p className="text-muted-foreground">
          Browse available tasks and submit your completed work
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>

          <div className="space-y-4">
            {filteredTasks
              .filter((task) => task.status === "active")
              .map((task) => (
                <Card
                  key={task.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleTaskSelect(task)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        {task.description}
                      </CardTitle>
                      <Badge variant="secondary">{task.bounty} USDC</Badge>
                    </div>
                    <CardDescription>{task.conditions}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>Bounty: {task.bounty} USDC</span>
                    </div>
                  </CardContent>
                </Card>
              ))}

            {filteredTasks.filter((task) => task.status === "active").length ===
              0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No tasks found matching your search criteria.</p>
              </div>
            )}
          </div>
        </div>

        {/* Task Details and Fulfilment */}
        <div>
          {selectedTask ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{selectedTask.description}</CardTitle>
                  <CardDescription>Task Details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Bounty</Label>
                    <p className="font-medium">{selectedTask.bounty} USDC</p>
                  </div>
                  <div>
                    <Label>Conditions</Label>
                    <p className="text-muted-foreground">
                      {selectedTask.conditions}
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <Label>Status</Label>
                    <Badge
                      variant="outline"
                      className="bg-primary/10 text-primary border-primary/20"
                    >
                      {selectedTask.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <FulfilTaskForm taskId={selectedTask.id} />
            </div>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground">
                <p>Select a task to view details and submit your work</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
