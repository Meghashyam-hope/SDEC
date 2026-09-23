"use client";

import * as React from "react";
import { toast } from "sonner";
import { OtpInput } from "@/components/ui/otp-input";

export function DevUiOtpDemo() {
  const [value, setValue] = React.useState("");
  return (
    <div className="space-y-2">
      <OtpInput
        value={value}
        onChange={setValue}
        onComplete={(code) => toast.success(`Verified ${code}`)}
      />
      <p className="text-xs text-caption">
        Paste a 6-digit code, or type — arrow keys and backspace move focus.
      </p>
    </div>
  );
}
