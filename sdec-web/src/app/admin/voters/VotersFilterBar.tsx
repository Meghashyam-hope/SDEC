"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CsvImportDialog } from "./CsvImportDialog";

const YEARS = ["1", "2", "3", "4", "5"];

function VotersFilterBar({ departments }: { departments: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = React.useState(searchParams.get("q") ?? "");

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  React.useEffect(() => {
    const id = setTimeout(() => {
      if (q !== (searchParams.get("q") ?? "")) updateParam("q", q || null);
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const deptItems: Record<string, string> = Object.fromEntries([
    ["all", "All departments"],
    ...departments.map((d) => [d, d]),
  ]);
  const yearItems: Record<string, string> = Object.fromEntries([
    ["all", "All years"],
    ...YEARS.map((y) => [y, `Year ${y}`]),
  ]);
  const activeItems: Record<string, string> = {
    all: "All statuses",
    active: "Active",
    inactive: "Inactive",
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search name, roll number, email…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full sm:w-64"
      />
      <Select
        items={deptItems}
        value={searchParams.get("dept") ?? "all"}
        onValueChange={(v) => updateParam("dept", v as string)}
      >
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(deptItems).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        items={yearItems}
        value={searchParams.get("year") ?? "all"}
        onValueChange={(v) => updateParam("year", v as string)}
      >
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(yearItems).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        items={activeItems}
        value={searchParams.get("active") ?? "all"}
        onValueChange={(v) => updateParam("active", v as string)}
      >
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(activeItems).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="ml-auto">
        <CsvImportDialog />
      </div>
    </div>
  );
}

export { VotersFilterBar };
