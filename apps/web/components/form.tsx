import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

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

export function Field({ label, name, hint, error, id: idProp, ...input }: FieldProps) {
  const id = idProp ?? name;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
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

const controlClass =
  "rounded-lg border border-current/20 bg-transparent px-3 py-2 outline-none focus-visible:border-stock focus-visible:ring-2 focus-visible:ring-stock/40 aria-invalid:border-red-500";

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  name: string;
  hint?: string;
  error?: string;
}

export function TextAreaField({ label, name, hint, error, id: idProp, ...textarea }: TextAreaFieldProps) {
  const id = idProp ?? name;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={`min-h-28 ${controlClass}`}
        {...textarea}
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

interface Choice {
  value: string;
  label: string;
  description?: string;
}

/** A radio group with a visible legend, usable by keyboard and screen readers. */
export function ChoiceGroup({
  legend,
  name,
  choices,
  value,
  defaultValue,
  onChange,
  error,
}: {
  legend: string;
  name: string;
  choices: Choice[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  error?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2" aria-invalid={error ? true : undefined}>
      <legend className="mb-1.5 text-sm font-medium">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {choices.map((choice) => (
          <label
            key={choice.value}
            className="flex min-h-11 cursor-pointer gap-3 rounded-lg border border-current/20 p-3 has-checked:border-stock has-checked:ring-2 has-checked:ring-stock/30 has-focus-visible:ring-2 has-focus-visible:ring-stock/50"
          >
            <input
              type="radio"
              name={name}
              value={choice.value}
              {...(value !== undefined ? { checked: value === choice.value } : { defaultChecked: defaultValue === choice.value })}
              onChange={onChange ? () => onChange(choice.value) : undefined}
              className="mt-1 accent-[var(--color-stock)]"
            />
            <span>
              <span className="block font-medium">{choice.label}</span>
              {choice.description ? <span className="block text-sm text-muted">{choice.description}</span> : null}
            </span>
          </label>
        ))}
      </div>
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </fieldset>
  );
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="status" className="rounded-lg border border-stock/40 bg-stock/10 px-3 py-2 text-sm">
      {message}
    </p>
  );
}
