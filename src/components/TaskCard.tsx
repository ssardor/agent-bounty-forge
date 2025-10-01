import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, CheckCircle2, XCircle } from "lucide-react";

interface TaskCardProps {
  id: string;
  description: string;
  bounty: string;
  conditions: string;
  status: "active" | "completed" | "cancelled";
  onCancel?: (id: string) => void;
  onComplete?: (id: string) => void;
  isWritePending?: boolean;
}

export function TaskCard({
  id,
  description,
  bounty,
  conditions,
  status,
  onCancel,
  onComplete,
  isWritePending = false,
}: TaskCardProps) {
  const getStatusBadge = () => {
    switch (status) {
      case "active":
        return (
          <Badge
            variant="outline"
            className="bg-primary/10 text-primary border-primary/20"
          >
            Active
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="bg-green-500/10 text-green-600 border-green-500/20"
          >
            Completed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            variant="outline"
            className="bg-destructive/10 text-destructive border-destructive/20"
          >
            Cancelled
          </Badge>
        );
    }
  };

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">{description}</h3>
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="font-medium">{bounty} USDC</span>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">Completion Conditions:</span>
            <p className="text-muted-foreground mt-1">{conditions}</p>
          </div>
        </div>

        {status === "active" && (onCancel || onComplete) && (
          <div className="flex gap-2">
            {onComplete && (
              <Button
                variant="default"
                className="flex-1"
                onClick={() => onComplete(id)}
                disabled={isWritePending}
              >
                {isWritePending ? (
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Mark Complete
              </Button>
            )}
            {onCancel && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onCancel(id)}
                disabled={isWritePending}
              >
                {isWritePending ? (
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Cancel Task
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
