"use client";

import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";

export function ConfirmSubmitButton({
  message,
  children,
  className = "text-slate-500 hover:text-bad",
}: {
  message: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={`rounded-lg p-2 transition-colors ${className}`}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      aria-label="Excluir"
    >
      {children ?? <Trash2 size={16} />}
    </button>
  );
}
