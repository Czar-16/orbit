"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;
export function SheetContent({ children }: { children: React.ReactNode }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="dialog-overlay fixed inset-0 z-40" />
      <Dialog.Content className="sheet-content fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-[14px] border border-border-strong bg-surface-3 p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        <div className="mb-4 flex items-center justify-between">
          <Dialog.Title className="text-base font-semibold">
            More navigation
          </Dialog.Title>
          <Dialog.Close asChild>
            <Button variant="ghost" aria-label="Close navigation">
              <X size={20} aria-hidden="true" />
            </Button>
          </Dialog.Close>
        </div>
        <Dialog.Description className="mb-4 text-sm text-text-muted">
          Open your saved jobs, profile, or settings.
        </Dialog.Description>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
