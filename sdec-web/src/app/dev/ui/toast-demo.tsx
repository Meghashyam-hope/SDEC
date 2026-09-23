"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DevUiToastDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => toast.success("Ballot cast")}>
        Success
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.error("Election closed while reviewing")}
      >
        Error
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.info("Results publish in 2 hours")}
      >
        Info
      </Button>
    </div>
  );
}
