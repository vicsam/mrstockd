import type { InputHTMLAttributes, ReactNode } from "react";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12">
      <a href="/" className="mb-10 text-sm font-semibold tracking-wide text-stock uppercase">
        MrStockd
      </a>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-2 text-muted">{subtitle}</p> : null}
      <div className="mt-8">{children}</div>
      {footer ? <div className="mt-6 text-sm text-muted">{footer}</div> : null}
    </main>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  hint?: string;
  error?: string;
}

export function Field({ label, name, hint, error, ...input }: FieldProps) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className="min-h-11 rounded-lg border border-current/20 bg-transparent px-3 py-2 outline-none focus-visible:border-stock focus-visible:ring-2 focus-visible:ring-stock/40 aria-invalid:border-red-500"
        {...input}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
      {message}
    </p>
  );
}

export function SubmitButton({ pending, ready = true, children }: { pending: boolean; ready?: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending || !ready}
      aria-busy={pending}
      className="min-h-11 rounded-full bg-stock px-5 py-2.5 font-medium text-ink transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-stock/60 focus-visible:ring-offset-2 disabled:opacity-60"
    >
      {children}
    </button>
  );
}
