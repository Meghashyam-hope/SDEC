"use client";

import ReactMarkdown from "react-markdown";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export interface ManifestoSheetProps {
  name: string;
  manifesto: string;
}

function ManifestoSheet({ name, manifesto }: ManifestoSheetProps) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-medium text-teal underline-offset-2 hover:underline"
          />
        }
      >
        Read manifesto
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{name}</SheetTitle>
        </SheetHeader>
        <div className="prose prose-sm max-w-none px-4 pb-6 text-ink-2">
          <ReactMarkdown>{manifesto}</ReactMarkdown>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { ManifestoSheet };
