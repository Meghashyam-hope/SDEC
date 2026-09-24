"use client";

import * as React from "react";
import { Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { countEligibleVoters } from "@/actions/elections";
import type { Eligibility } from "@/lib/eligibility";

const YEARS = [1, 2, 3, 4, 5];

export interface EligibilityEditorProps {
  value: Eligibility;
  onChange: (value: Eligibility) => void;
  departments: string[];
  sections: string[];
  disabled?: boolean;
}

function toggle<T>(list: T[] | undefined, item: T): T[] {
  const current = list ?? [];
  return current.includes(item) ? current.filter((v) => v !== item) : [...current, item];
}

function EligibilityEditor({ value, onChange, departments, sections, disabled }: EligibilityEditorProps) {
  const [count, setCount] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    function schedule() {
      setLoading(true);
      return setTimeout(() => {
        countEligibleVoters(value)
          .then(setCount)
          .finally(() => setLoading(false));
      }, 300);
    }
    const timeout = schedule();
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value)]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <p className="text-sm font-medium text-ink">Departments</p>
          <p className="text-xs text-caption">Leave empty for all departments</p>
          <div className="flex flex-col gap-1.5">
            {departments.map((dept) => (
              <label key={dept} className="flex items-center gap-2 text-sm text-ink-2">
                <Checkbox
                  checked={(value.departments ?? []).includes(dept)}
                  disabled={disabled}
                  onCheckedChange={() =>
                    onChange({ ...value, departments: toggle(value.departments, dept) })
                  }
                />
                {dept}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-ink">Years</p>
          <p className="text-xs text-caption">Leave empty for all years</p>
          <div className="flex flex-col gap-1.5">
            {YEARS.map((year) => (
              <label key={year} className="flex items-center gap-2 text-sm text-ink-2">
                <Checkbox
                  checked={(value.years ?? []).includes(year)}
                  disabled={disabled}
                  onCheckedChange={() => onChange({ ...value, years: toggle(value.years, year) })}
                />
                Year {year}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-ink">Sections</p>
          <p className="text-xs text-caption">Leave empty for all sections</p>
          <div className="flex flex-col gap-1.5">
            {sections.length === 0 ? (
              <p className="text-xs text-caption">No sections on the roll yet</p>
            ) : (
              sections.map((section) => (
                <label key={section} className="flex items-center gap-2 text-sm text-ink-2">
                  <Checkbox
                    checked={(value.sections ?? []).includes(section)}
                    disabled={disabled}
                    onCheckedChange={() =>
                      onChange({ ...value, sections: toggle(value.sections, section) })
                    }
                  />
                  {section}
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-teal-tint px-3 py-2 text-sm text-teal">
        <Users className="size-4" />
        {loading ? "Counting…" : `${count ?? 0} eligible voter${count === 1 ? "" : "s"}`}
      </div>
    </div>
  );
}

export { EligibilityEditor };
