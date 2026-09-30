/** Contact form validation — shared by the browser and the API route. */

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
  /** Honeypot. Humans never see or fill this field. */
  website?: string;
}

export type ContactField = "name" | "email" | "message";
export type ContactFieldErrors = Partial<Record<ContactField, string>>;

export const CONTACT_LIMITS = {
  name: { min: 2, max: 120 },
  email: { max: 254 },
  message: { min: 10, max: 5000 },
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateField(field: ContactField, raw: string): string | undefined {
  const value = raw.trim();
  switch (field) {
    case "name":
      if (!value) return "Please tell us your name.";
      if (value.length < CONTACT_LIMITS.name.min) return "That name looks too short.";
      if (value.length > CONTACT_LIMITS.name.max) return `Please keep it under ${CONTACT_LIMITS.name.max} characters.`;
      return;
    case "email":
      if (!value) return "We need an email address to reply.";
      if (value.length > CONTACT_LIMITS.email.max || !EMAIL_RE.test(value)) return "That email address doesn't look right.";
      return;
    case "message":
      if (!value) return "Write us a message.";
      if (value.length < CONTACT_LIMITS.message.min) return `A little more detail, please (at least ${CONTACT_LIMITS.message.min} characters).`;
      if (value.length > CONTACT_LIMITS.message.max) return `Please keep it under ${CONTACT_LIMITS.message.max} characters.`;
      return;
  }
}

export function validateContact(payload: Partial<ContactPayload>): ContactFieldErrors {
  const errors: ContactFieldErrors = {};
  (["name", "email", "message"] as const).forEach((field) => {
    const raw = payload[field];
    const error = validateField(field, typeof raw === "string" ? raw : "");
    if (error) errors[field] = error;
  });
  return errors;
}

export function sanitizePayload(payload: Partial<ContactPayload>): ContactPayload {
  const clean = (v: unknown, max: number) =>
    (typeof v === "string" ? v : "")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .trim()
      .slice(0, max);
  return {
    name: clean(payload.name, CONTACT_LIMITS.name.max),
    email: clean(payload.email, CONTACT_LIMITS.email.max),
    message: clean(payload.message, CONTACT_LIMITS.message.max),
    website: clean(payload.website, 200),
  };
}
