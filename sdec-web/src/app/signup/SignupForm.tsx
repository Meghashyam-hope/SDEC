"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { claimVoterAccount } from "@/actions/auth";

const ERROR_MESSAGE: Record<string, string> = {
  invalid_details: "That roll number and phone number don't match our records. Check both and try again.",
  weak_password: "Password must be at least 8 characters.",
  too_many_attempts: "Too many attempts. Try again in a few minutes.",
  unknown: "Something went wrong. Try again.",
};

function SignupForm() {
  const router = useRouter();
  const [rollNumber, setRollNumber] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const passwordsMatch = password.length > 0 && password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rollNumber.trim() || !phone.trim() || !passwordsMatch) return;

    setPending(true);
    setError(null);
    const result = await claimVoterAccount(rollNumber.trim(), phone.trim(), password);

    if (!result.ok) {
      setError(ERROR_MESSAGE[result.error] ?? ERROR_MESSAGE.unknown);
      setPending(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Set up your account</CardTitle>
          <CardDescription>
            Enter your roll number and the phone number on file with the election commission to
            create your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="roll-number">Roll number</Label>
            <Input
              id="roll-number"
              autoFocus
              value={rollNumber}
              placeholder="2473A05133"
              onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              placeholder="9876543210"
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-xs text-caption">
              The one the commission has on file for you — ask them if you&apos;re not sure.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={confirmPassword.length > 0 && !passwordsMatch}
            />
            {confirmPassword.length > 0 && !passwordsMatch ? (
              <p className="text-xs text-destructive">Passwords don&apos;t match.</p>
            ) : null}
          </div>
          {error ? (
            <p className="text-xs text-destructive" role="alert" aria-live="polite">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            className="w-full"
            disabled={pending || !rollNumber.trim() || !phone.trim() || !passwordsMatch}
          >
            {pending ? "Setting up…" : "Set up account"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}

export { SignupForm };
