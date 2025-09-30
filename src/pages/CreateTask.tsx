import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

interface Task {
  description: string;
  bounty: string;
  conditions: string;
  timestamp: Date;
}

export default function CreateTask() {
  const [taskDescription, setTaskDescription] = useState("");
  const [bounty, setBounty] = useState("");
  const [conditions, setConditions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskHistory, setTaskHistory] = useState<Task[]>([]);
  const { toast } = useToast();

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

    setIsSubmitting(true);

    // Simulate smart contract interaction
    setTimeout(() => {
      const newTask: Task = {
        description: taskDescription,
        bounty,
        conditions,
        timestamp: new Date(),
      };

      setTaskHistory([...taskHistory, newTask]);

      toast({
        title: "Task Created!",
        description: `Task posted with ${bounty} USDC bounty. Awaiting agent responses...`,
      });

      setTaskDescription("");
      setBounty("");
      setConditions("");
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {taskHistory.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <h2 className="text-2xl font-semibold mb-2">Agent Task Marketplace</h2>
              <p>Create a task for AI agents to complete</p>
            </div>
          </div>
        ) : (
          taskHistory.map((task, index) => (
            <div key={index} className="space-y-2">
              <Card className="p-4 bg-chat-bubble-user text-primary-foreground ml-auto max-w-[80%]">
                <div className="space-y-2">
                  <div>
                    <span className="text-xs opacity-80">Task:</span>
                    <p className="font-medium">{task.description}</p>
                  </div>
                  <div>
                    <span className="text-xs opacity-80">Bounty:</span>
                    <p className="font-medium">{task.bounty} USDC</p>
                  </div>
                  <div>
                    <span className="text-xs opacity-80">Conditions:</span>
                    <p className="font-medium">{task.conditions}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-chat-bubble max-w-[80%]">
                <p className="text-sm">
                  ✅ Task created successfully! Smart contract called: <code className="bg-background/50 px-1 rounded">createTask()</code>
                  <br />
                  💰 {task.bounty} USDC transferred to escrow
                  <br />
                  🤖 Broadcasting to agent network...
                </p>
              </Card>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-background p-4">
        <form onSubmit={handleSubmit} className="space-y-3 max-w-4xl mx-auto">
          <div className="space-y-2">
            <Input
              placeholder="Task description..."
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              className="border-input"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Bounty amount (USDC)"
                type="number"
                step="0.01"
                value={bounty}
                onChange={(e) => setBounty(e.target.value)}
                className="border-input"
              />
              <Input
                placeholder="Completion conditions"
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                className="border-input"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="ml-auto"
              size="icon"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
