"use client";

import { type InputHTMLAttributes, type ReactNode, useId, useState } from "react";

const inputBase =
  "h-12 w-full rounded-[10px] border border-[#e3e1ea] bg-white px-4 text-[15px] text-[var(--l-ink)] shadow-[0_1px_2px_rgba(13,12,34,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-[#9a98a8] hover:border-[#cfcbdb] focus:border-[var(--l-brand)] focus:shadow-[0_0_0_3px_rgba(175,26,93,0.14)] aria-invalid:border-[#d92d20] aria-invalid:focus:shadow-[0_0_0_3px_rgba(217,45,32,0.14)] disabled:opacity-60";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  /** Shown on the right of the label, e.g. "Forgot password?" or "10+ characters". */
  labelAside?: ReactNode;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  error?: string;
  hint?: string;
}

export function TextField({ label, name, labelAside, iconLeft, iconRight, error, hint, id: idProp, className = "", ...input }: TextFieldProps) {
  const autoId = useId();
  const id = idProp ?? `${name}-${autoId}`;
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[14px] leading-5 font-semibold text-[var(--l-ink)]">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative">
        {iconLeft ? <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[#8a8799]">{iconLeft}</span> : null}
        <input
          id={id}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${inputBase} ${iconLeft ? "pl-11" : ""} ${iconRight ? "pr-12" : ""} ${className}`}
          {...input}
        />
        {iconRight ? <span className="absolute top-1/2 right-2 -translate-y-1/2">{iconRight}</span> : null}
      </div>
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-[12px] text-[var(--l-muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] font-medium text-[#b42318]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Password input with a show/hide toggle. */
export function PasswordField(props: Omit<TextFieldProps, "type" | "iconRight">) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      iconRight={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="grid size-9 place-items-center rounded-lg text-[#8a8799] outline-none hover:text-[var(--l-ink)] focus-visible:ring-2 focus-visible:ring-[var(--l-violet)]"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
    />
  );
}

export function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 text-[14px] text-[var(--l-ink-2)] select-none">
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="size-[18px] cursor-pointer rounded-[5px] border-[#cfcbdb] accent-[var(--l-brand)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--l-violet)] focus-visible:ring-offset-2"
      />
      {label}
    </label>
  );
}

export function PrimaryButton({ children, pending, ready = true, disabled }: { children: ReactNode; pending?: boolean; ready?: boolean; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending || !ready || disabled}
      aria-busy={pending || undefined}
      className="group flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#0d0c22] text-[15px] font-semibold text-white shadow-[0_8px_16px_-6px_rgba(13,12,34,0.4)] outline-none transition-[transform,background-color] hover:bg-[#1f1d3a] focus-visible:ring-2 focus-visible:ring-[var(--l-violet)] focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden /> : null}
      {children}
      {pending ? null : <ArrowIcon />}
    </button>
  );
}

export function FormAlert({ message, tone = "error" }: { message: string | null; tone?: "error" | "success" }) {
  if (!message) return null;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-[10px] border px-4 py-3 text-[14px] leading-5 ${
        tone === "error" ? "border-[#fecdca] bg-[#fef3f2] text-[#b42318]" : "border-[#abefc6] bg-[#ecfdf3] text-[#067647]"
      }`}
    >
      {message}
    </div>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-[12px] font-medium text-[var(--l-muted)]">
      <span className="h-px flex-1 bg-[#e3e1ea]" />
      {label}
      <span className="h-px flex-1 bg-[#e3e1ea]" />
    </div>
  );
}

/* Icons */
export function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="transition-transform group-hover:translate-x-0.5">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
      <path d="M3 3l18 18M10.6 5.1A10.5 10.5 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}
export function AtIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden className="text-[#8a8799]">
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
    </svg>
  );
}
export function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
