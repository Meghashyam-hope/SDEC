"use client";

import * as React from "react";
import { cn } from "cn";

const DIGIT_PATTERN = /^[0-9]$/;

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  "aria-label"?: string;
  className?: string;
}

/**
 * A row of single-digit boxes for entering an email OTP code. Supports
 * paste (splits the pasted string across boxes), backspace-to-previous,
 * and arrow-key navigation. Reports the full code via onChange, and fires
 * onComplete once every box is filled.
 */
function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled,
  autoFocus,
  className,
  ...props
}: OtpInputProps) {
  const inputRefs = React.useRef<Array<HTMLInputElement | null>>([]);
  const digits = React.useMemo(() => {
    const chars = value.split("").slice(0, length);
    return Array.from({ length }, (_, i) => chars[i] ?? "");
  }, [value, length]);

  const setDigit = (index: number, digit: string) => {
    const next = digits.slice();
    next[index] = digit;
    const joined = next.join("");
    onChange(joined);
    if (joined.length === length && next.every((d) => d !== "")) {
      onComplete?.(joined);
    }
  };

  const focusIndex = (index: number) => {
    inputRefs.current[Math.max(0, Math.min(length - 1, index))]?.focus();
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.slice(-1);
    if (digit && !DIGIT_PATTERN.test(digit)) return;
    setDigit(index, digit);
    if (digit) focusIndex(index + 1);
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        setDigit(index, "");
      } else {
        focusIndex(index - 1);
        setDigit(index - 1, "");
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft") {
      focusIndex(index - 1);
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      focusIndex(index + 1);
      e.preventDefault();
    }
  };

  const handlePaste = (
    index: number,
    e: React.ClipboardEvent<HTMLInputElement>,
  ) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();
    const next = digits.slice();
    for (let i = 0; i < pasted.length && index + i < length; i++) {
      next[index + i] = pasted[i];
    }
    const joined = next.join("");
    onChange(joined);
    if (joined.length === length && next.every((d) => d !== "")) {
      onComplete?.(joined);
    }
    focusIndex(Math.min(length - 1, index + pasted.length));
  };

  return (
    <div
      role="group"
      aria-label={props["aria-label"] ?? "One-time verification code"}
      className={cn("flex gap-2", className)}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={`Digit ${index + 1} of ${length}`}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={(e) => handlePaste(index, e)}
          onFocus={(e) => e.currentTarget.select()}
          className={cn(
            "h-12 w-10 rounded-xl border border-input bg-surface text-center text-lg font-medium tabular-nums text-ink outline-none transition-colors sm:h-14 sm:w-12 sm:text-xl",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        />
      ))}
    </div>
  );
}

export { OtpInput };
