import { notFound } from "next/navigation";
import Link from "next/link";
import { Vote, Inbox, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { PhaseBadge } from "@/components/election/PhaseBadge";
import { AppHeader } from "@/components/AppHeader";
import type { ElectionPhase } from "@/lib/election-phase";
import { DevUiToastDemo } from "./toast-demo";
import { DevUiOtpDemo } from "./otp-demo";
import { DevUiCountdownDemo } from "./countdown-demo";

const ALL_PHASES: ElectionPhase[] = [
  "draft",
  "nominations",
  "scheduled",
  "live",
  "paused",
  "ended",
  "results",
  "cancelled",
];

const COLOR_TOKENS = [
  { name: "bg", value: "#F7F7F4", className: "bg-background" },
  { name: "surface", value: "#FFFFFF", className: "bg-surface border border-border" },
  { name: "surface-2", value: "#F0F0EB", className: "bg-surface-2" },
  { name: "border", value: "#E4E3DD", className: "bg-border" },
  { name: "ink", value: "#14171F", className: "bg-ink" },
  { name: "ink-2", value: "#4A5060", className: "bg-ink-2" },
  { name: "caption", value: "#7A808C", className: "bg-caption" },
  { name: "navy", value: "#1F2A4D", className: "bg-navy" },
  { name: "teal", value: "#0E8C7A", className: "bg-teal" },
  { name: "teal-tint", value: "#E3F4F0", className: "bg-teal-tint" },
  { name: "amber", value: "#B7791F", className: "bg-amber" },
  { name: "amber-tint", value: "#FBF3E2", className: "bg-amber-tint" },
  { name: "red", value: "#C2362F", className: "bg-red-c" },
  { name: "red-tint", value: "#FCEBEA", className: "bg-red-tint" },
];

const SECTIONS = [
  ["colors", "Colors"],
  ["type", "Typography"],
  ["buttons", "Buttons"],
  ["forms", "Form controls"],
  ["otp", "OTP input"],
  ["badges", "Badges & phase"],
  ["countdown", "Countdown"],
  ["cards", "Cards"],
  ["overlays", "Dialog & Sheet"],
  ["loading", "Loading"],
  ["states", "Empty & error states"],
  ["toasts", "Toasts"],
] as const;

export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <div className="mx-auto flex max-w-(--breakpoint-xl) gap-8 px-4 py-8 sm:px-6">
        <nav className="sticky top-20 hidden h-fit w-44 shrink-0 flex-col gap-1 lg:flex">
          {SECTIONS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-lg px-2.5 py-1.5 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              {label}
            </a>
          ))}
          <Separator className="my-2" />
          <Link
            href="/dev/ui/admin-shell"
            className="rounded-lg px-2.5 py-1.5 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            Admin shell →
          </Link>
        </nav>

        <main className="min-w-0 flex-1 space-y-16 pb-24">
          <div>
            <h1 className="font-heading text-3xl font-semibold text-navy">
              SDEC design system
            </h1>
            <p className="mt-1 text-caption">
              Every base component in every state. Dev-only — 404s in production.
            </p>
          </div>

          <section id="colors" className="scroll-mt-20 space-y-4">
            <h2 className="text-lg font-semibold text-ink">Colors</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {COLOR_TOKENS.map((t) => (
                <div key={t.name} className="space-y-1.5">
                  <div className={`h-16 rounded-xl ${t.className}`} />
                  <p className="text-xs font-medium text-ink">{t.name}</p>
                  <p className="text-xs text-caption">{t.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="type" className="scroll-mt-20 space-y-4">
            <h2 className="text-lg font-semibold text-ink">Typography</h2>
            <div className="space-y-3 rounded-2xl border border-border bg-surface p-6">
              <p className="font-heading text-4xl font-semibold text-navy">
                Student Council Elections 2026
              </p>
              <p className="text-base text-ink">
                Body text uses Geist Sans at 15px on mobile, 16px on desktop.
              </p>
              <p className="text-sm text-ink-2">Secondary text — Geist Sans, --ink-2.</p>
              <p className="text-sm text-caption">Caption / placeholder text — --caption.</p>
              <p className="font-heading text-5xl font-semibold tabular-nums text-teal">
                4A9K 2XQ7
              </p>
              <p className="text-xs text-caption">
                Receipt code: Fraunces, tabular-nums, letter-spacing.
              </p>
            </div>
          </section>

          <section id="buttons" className="scroll-mt-20 space-y-4">
            <h2 className="text-lg font-semibold text-ink">Buttons</h2>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-6">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
              <Button disabled>Disabled</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
            </div>
          </section>

          <section id="forms" className="scroll-mt-20 space-y-4">
            <h2 className="text-lg font-semibold text-ink">Form controls</h2>
            <div className="grid gap-6 rounded-2xl border border-border bg-surface p-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="dev-roll">Roll number</Label>
                <Input id="dev-roll" placeholder="CS21B045" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dev-roll-err">With error</Label>
                <Input id="dev-roll-err" aria-invalid defaultValue="XX0000" />
                <p className="text-xs text-destructive">Not on the voter roll.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dev-disabled">Disabled</Label>
                <Input id="dev-disabled" disabled defaultValue="Locked" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dev-dept">Department</Label>
                <Select
                  items={{ cse: "CSE", ece: "ECE", eee: "EEE", mech: "MECH" }}
                  defaultValue="cse"
                >
                  <SelectTrigger id="dev-dept" className="w-full">
                    <SelectValue placeholder="Choose a department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cse">CSE</SelectItem>
                    <SelectItem value="ece">ECE</SelectItem>
                    <SelectItem value="eee">EEE</SelectItem>
                    <SelectItem value="mech">MECH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="dev-manifesto">Manifesto</Label>
                <Textarea id="dev-manifesto" placeholder="What will you do for your class?" />
              </div>
              <div className="space-y-2">
                <Label>Pick up to 2</Label>
                <div className="flex items-center gap-2">
                  <Checkbox id="dev-cb-1" defaultChecked />
                  <Label htmlFor="dev-cb-1" className="font-normal">Ananya Rao</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="dev-cb-2" />
                  <Label htmlFor="dev-cb-2" className="font-normal">Kabir Shah</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Single choice</Label>
                <RadioGroup defaultValue="a">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="a" id="dev-r-a" />
                    <Label htmlFor="dev-r-a" className="font-normal">President — Meera Iyer</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="b" id="dev-r-b" />
                    <Label htmlFor="dev-r-b" className="font-normal">President — Rohan Das</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </section>

          <section id="otp" className="scroll-mt-20 space-y-4">
            <h2 className="text-lg font-semibold text-ink">OTP input</h2>
            <div className="rounded-2xl border border-border bg-surface p-6">
              <DevUiOtpDemo />
            </div>
          </section>

          <section id="badges" className="scroll-mt-20 space-y-4">
            <h2 className="text-lg font-semibold text-ink">Badges &amp; phase</h2>
            <div className="space-y-4 rounded-2xl border border-border bg-surface p-6">
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_PHASES.map((p) => (
                  <PhaseBadge key={p} phase={p} />
                ))}
              </div>
            </div>
          </section>

          <section id="countdown" className="scroll-mt-20 space-y-4">
            <h2 className="text-lg font-semibold text-ink">Countdown</h2>
            <DevUiCountdownDemo />
          </section>

          <section id="cards" className="scroll-mt-20 space-y-4">
            <h2 className="text-lg font-semibold text-ink">Cards</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Class Representative — CSE</CardTitle>
                  <CardDescription>2 seats · pick up to 2</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-ink-2">
                  Election-day card content goes here.
                </CardContent>
                <CardFooter>
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </CardFooter>
              </Card>
              <Card className="border-teal bg-teal-tint/40">
                <CardHeader>
                  <CardTitle>Selected state</CardTitle>
                  <CardDescription>Teal border + tint, per §8</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-ink-2">
                  Used for a chosen candidate card on the ballot.
                </CardContent>
              </Card>
            </div>
          </section>

          <section id="overlays" className="scroll-mt-20 space-y-4">
            <h2 className="text-lg font-semibold text-ink">Dialog &amp; Sheet</h2>
            <div className="flex flex-wrap gap-3 rounded-2xl border border-border bg-surface p-6">
              <Dialog>
                <DialogTrigger render={<Button variant="outline">Open dialog</Button>} />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Close this election early?</DialogTitle>
                    <DialogDescription>
                      This stops voting immediately. It is written to the audit log.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline">Cancel</Button>} />
                    <Button variant="destructive">Close early</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Sheet>
                <SheetTrigger render={<Button variant="outline">Open sheet</Button>} />
                <SheetContent side="right" className="p-4">
                  <SheetTitle>Review your choices</SheetTitle>
                  <p className="mt-2 text-sm text-ink-2">
                    Sheets are used for the ballot review step and manifesto detail.
                  </p>
                </SheetContent>
              </Sheet>
            </div>
          </section>

          <section id="loading" className="scroll-mt-20 space-y-4">
            <h2 className="text-lg font-semibold text-ink">Loading</h2>
            <div className="space-y-3 rounded-2xl border border-border bg-surface p-6">
              <div className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          </section>

          <section id="states" className="scroll-mt-20 space-y-4">
            <h2 className="text-lg font-semibold text-ink">Empty &amp; error states</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <EmptyState
                icon={<Vote />}
                title="No elections yet"
                description="Elections you're eligible for will show up here once the commission publishes one."
              />
              <EmptyState
                icon={<Inbox />}
                title="You've already voted"
                description="You voted at 10:42 AM. Results will be published once voting closes."
                action={
                  <Button size="sm" variant="outline">
                    View receipt
                  </Button>
                }
              />
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-c/30 bg-red-tint px-6 py-8 text-center sm:col-span-2">
                <TriangleAlert className="size-8 text-red-c" />
                <p className="font-medium text-ink">Something went wrong</p>
                <p className="max-w-sm text-sm text-ink-2">
                  The election closed while you were reviewing your ballot. Your choices were not submitted.
                </p>
                <Button size="sm" variant="outline">
                  Back to dashboard
                </Button>
              </div>
            </div>
          </section>

          <section id="toasts" className="scroll-mt-20 space-y-4">
            <h2 className="text-lg font-semibold text-ink">Toasts</h2>
            <div className="rounded-2xl border border-border bg-surface p-6">
              <DevUiToastDemo />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
