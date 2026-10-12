"use client";
import { useRef, type RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/form-feedback";

export function ConfirmationDialog({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel,
  pendingLabel,
  pending,
  result,
  returnFocus,
  destructive = true,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  pending: boolean;
  result: ActionResult | null;
  returnFocus: RefObject<HTMLElement | null>;
  destructive?: boolean;
}) {
  const cancel = useRef<HTMLButtonElement>(null);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-40" />
        <Dialog.Content
          className="dialog-content fixed left-1/2 top-1/2 z-50 w-[calc(100%_-_32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-border-strong bg-surface p-4 md:p-[22px]"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            cancel.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (returnFocus.current?.isConnected) returnFocus.current.focus();
            else document.getElementById("main")?.focus();
          }}
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (pending) event.preventDefault();
          }}
        >
          <Dialog.Title className="text-xl font-bold">{title}</Dialog.Title>
          <Dialog.Description className="mt-3 text-base text-text-muted">
            {description}
          </Dialog.Description>
          <FormFeedback result={result?.ok === false ? result : null} />
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button
              ref={cancel}
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={destructive ? "destructive-confirm" : "default"}
              loading={pending}
              onClick={onConfirm}
            >
              {pending ? pendingLabel : confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
