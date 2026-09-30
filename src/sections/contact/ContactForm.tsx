"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import s from "./Contact.module.css";
import { submitContact, ApiError } from "@/lib/api/client";
import { validateContact, validateField, CONTACT_LIMITS, type ContactField, type ContactFieldErrors } from "@/lib/validation/contact";
import { track } from "@/lib/analytics";

type Status = "idle" | "submitting" | "success" | "error";

const FIELDS: { name: ContactField; label: string; type: "text" | "email" | "textarea"; autoComplete: string; placeholder: string }[] = [
  { name: "name", label: "Name", type: "text", autoComplete: "name", placeholder: "Your name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@domain.com" },
  { name: "message", label: "Message", type: "textarea", autoComplete: "off", placeholder: "Tell us about your idea…" },
];

export default function ContactForm() {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState({ name: "", email: "", message: "", website: "" });
  const [errors, setErrors] = useState<ContactFieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<ContactField, boolean>>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState("");

  const update = (field: keyof typeof values, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (field !== "website" && touched[field]) {
      setErrors((e) => ({ ...e, [field]: validateField(field, value) }));
    }
  };

  const blur = (field: ContactField) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((e) => ({ ...e, [field]: validateField(field, values[field]) }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;
    const found = validateContact(values);
    setErrors(found);
    setTouched({ name: true, email: true, message: true });
    const firstInvalid = (Object.keys(found) as ContactField[])[0];
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }
    setStatus("submitting");
    setServerError("");
    track("contact_submit");
    try {
      await submitContact(values);
      setStatus("success");
      track("contact_success");
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.fieldErrors) setErrors(apiErr.fieldErrors);
      setServerError(apiErr?.message ?? "Network error — please check your connection and try again.");
      setStatus("error");
      track("contact_error", { status: apiErr?.status ?? 0 });
    }
  };

  const reset = () => {
    setValues({ name: "", email: "", message: "", website: "" });
    setErrors({});
    setTouched({});
    setStatus("idle");
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[name="name"]')?.focus());
  };

  if (status === "success") {
    return (
      <div className={s.success} role="status" aria-live="polite">
        <div className={s.successIcon} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <p className={s.successTitle}>Message received.</p>
        <p className={s.successText}>Thank you, {values.name.split(" ")[0] || "friend"}. Your message has been delivered.</p>
        <button type="button" className={s.linkButton} onClick={reset}>
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} className={s.form} onSubmit={onSubmit} noValidate aria-describedby={`${id}-status`}>
      <p className={s.formTitle}>Send a transmission</p>
      {FIELDS.map((f) => {
        const err = touched[f.name] ? errors[f.name] : undefined;
        const common = {
          id: `${id}-${f.name}`,
          name: f.name,
          value: values[f.name],
          placeholder: f.placeholder,
          autoComplete: f.autoComplete,
          required: true,
          "aria-invalid": err ? true : undefined,
          "aria-describedby": err ? `${id}-${f.name}-error` : undefined,
          onBlur: () => blur(f.name),
        };
        return (
          <div className={s.field} key={f.name}>
            <label className={s.label} htmlFor={common.id}>
              {f.label}
            </label>
            {f.type === "textarea" ? (
              <textarea className={s.textarea} maxLength={CONTACT_LIMITS.message.max} {...common} onChange={(e) => update(f.name, e.target.value)} data-lenis-prevent="" />
            ) : (
              <input className={s.input} type={f.type} maxLength={f.name === "name" ? CONTACT_LIMITS.name.max : CONTACT_LIMITS.email.max} {...common} onChange={(e) => update(f.name, e.target.value)} />
            )}
            {err && (
              <p className={s.error} id={`${id}-${f.name}-error`}>
                {err}
              </p>
            )}
          </div>
        );
      })}

      {/* Honeypot — hidden from people and assistive tech. */}
      <div className={s.honeypot} aria-hidden="true">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => update("website", e.target.value)} />
      </div>

      <button className={s.submit} type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? (
          <>
            <span className={s.spinner} aria-hidden="true" /> Sending…
          </>
        ) : status === "error" ? (
          "Try again"
        ) : (
          "Send message"
        )}
      </button>
      <p id={`${id}-status`} className={`${s.status} ${status === "error" ? s.statusError : ""}`} role={status === "error" ? "alert" : "status"} aria-live="polite">
        {status === "error" ? serverError : ""}
      </p>
    </form>
  );
}
