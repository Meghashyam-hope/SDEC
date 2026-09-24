"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type SignInResult =
  | { ok: true }
  | { ok: false; error: "invalid_credentials" | "too_many_attempts" | "unknown" };

export interface PasswordLoginFlowProps {
  /** "Roll number or email" / "Email" */
  identifierLabel: string;
  identifierPlaceholder: string;
  /** Uppercases as you type, unless what's typed looks like an email. */
  uppercaseIdentifier?: boolean;
  redirectTo: string;
  signIn: (identifier: string, password: string) => Promise<SignInResult>;
}

function errorMessage(err: "invalid_credentials" | "too_many_attempts" | "unknown"): string {
  if (err === "invalid_credentials") return "That didn't match our records. Check your details and try again.";
  if (err === "too_many_attempts") return "Too many attempts. Try again in a few minutes.";
  return "Something went wrong. Try again.";
}

function PasswordLoginFlow({
  identifierLabel,
  identifierPlaceholder,
  uppercaseIdentifier,
  redirectTo,
  signIn,
}: PasswordLoginFlowProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function handleIdentifierChange(value: string) {
    const shouldUppercase = uppercaseIdentifier && !value.includes("@");
    setIdentifier(shouldUppercase ? value.toUpperCase() : value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password) return;

    setPending(true);
    setError(null);
    const result = await signIn(identifier.trim(), password);

    if (!result.ok) {
      setError(errorMessage(result.error));
      setPending(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Enter your {identifierLabel.toLowerCase()} and password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="identifier">{identifierLabel}</Label>
            <Input
              id="identifier"
              autoFocus
              value={identifier}
              placeholder={identifierPlaceholder}
              onChange={(e) => handleIdentifierChange(e.target.value)}
              aria-invalid={!!error}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!error}
            />
          </div>
          {error ? (
            <p className="text-xs text-destructive" role="alert" aria-live="polite">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending || !identifier.trim() || !password}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}

export { PasswordLoginFlow };
