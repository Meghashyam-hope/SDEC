"use client";

import { Check } from "lucide-react";
import { cn } from "cn";

export interface NotaOptionProps {
  inputType: "radio" | "checkbox";
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** "None of the above" — a position-level choice, mutually exclusive with
 * picking any candidate for that position (SDEC_PLAN §6/§8). */
function NotaOption({ inputType, name, checked, onChange }: NotaOptionProps) {
  return (
    <label
      className={cn(
        "relative flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed bg-surface p-3 transition-all duration-200 ease-out",
        checked ? "border-teal bg-teal-tint" : "border-border hover:border-teal/40",
      )}
    >
      <input
        type={inputType}
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-xs font-medium text-caption">
        N/A
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">None of the above</p>
        <p className="text-sm text-ink-2">Actively choose not to vote for this position</p>
      </div>
      {checked ? (
        <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-teal text-white shadow-sm">
          <Check className="size-3" strokeWidth={3} />
        </span>
      ) : null}
      <div className="pointer-events-none absolute inset-0 rounded-2xl peer-focus-visible:ring-2 peer-focus-visible:ring-teal peer-focus-visible:ring-offset-2" />
    </label>
  );
}

export { NotaOption };
