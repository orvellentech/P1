"use client";

import { useRef } from "react";
import s from "./Contact.module.css";
import ContactForm from "./ContactForm";
import ContactIcon from "./ContactIcons";
import { gsap } from "@/lib/gsap";
import { useGsap } from "@/hooks/useGsap";
import { useExperience } from "@/lib/store/experienceStore";
import { scrollEngine } from "@/lib/scroll/scrollEngine";
import { attachTilt } from "@/animations/about";
import { track } from "@/lib/analytics";
import { SCROLL } from "@/config/animation.config";
import type { SiteContent } from "@/config/types";

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  twitter: "X / Twitter",
  github: "GitHub",
  youtube: "YouTube",
};

interface Channel {
  key: string;
  icon: string;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}

/** Builds the channel list strictly from configuration — nothing is invented. */
function channelsFrom(content: SiteContent): Channel[] {
  const { contact, social } = content;
  const out: Channel[] = [];
  if (contact.email) out.push({ key: "email", icon: "email", label: "Email", value: contact.email, href: `mailto:${contact.email}` });
  if (contact.phone) out.push({ key: "phone", icon: "phone", label: "Phone", value: contact.phone, href: `tel:${contact.phone.replace(/[^\d+]/g, "")}` });
  if (contact.whatsapp) {
    const digits = contact.whatsapp.replace(/\D/g, "");
    out.push({ key: "whatsapp", icon: "whatsapp", label: "WhatsApp", value: `+${digits}`, href: `https://wa.me/${digits}`, external: true });
  }
  if (contact.address) out.push({ key: "address", icon: "address", label: "Address", value: contact.address });
  for (const [platform, url] of Object.entries(social)) {
    if (!url) continue;
    out.push({ key: platform, icon: platform, label: SOCIAL_LABELS[platform] ?? platform, value: url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""), href: url, external: true });
  }
  return out;
}

/** Chapter IX — contact, set inside the 2060 world. */
export default function ContactSection({ content }: { content: SiteContent }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useExperience((st) => st.reducedMotion);
  const channels = channelsFrom(content);

  useGsap(
    ref,
    () => {
      const root = ref.current!;
      const panel = root.querySelector<HTMLElement>("[data-panel]")!;
      const wrap = root.querySelector<HTMLElement>("[data-panel-wrap]")!;
      const items = root.querySelectorAll("[data-rise]");
      if (reduced) {
        gsap.fromTo([wrap, ...items], { opacity: 0 }, { opacity: 1, duration: 0.6, scrollTrigger: { trigger: root, start: "top 70%" } });
        return;
      }
      // The wrapper rises out of depth on scroll; the panel inside tilts with the pointer.
      gsap.fromTo(wrap, { rotationX: 16, z: -240, opacity: 0, y: 60 }, { rotationX: 0, z: 0, opacity: 1, y: 0, ease: "power2.out", scrollTrigger: { trigger: root, start: "top 85%", end: "top 25%", scrub: SCROLL.scrub } });
      gsap.fromTo(items, { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.08, ease: "power2.out", scrollTrigger: { trigger: root, start: "top 80%", end: "top 30%", scrub: SCROLL.scrub } });
      return attachTilt(panel, panel);
    },
    [reduced],
  );

  const year = new Date().getFullYear();
  const showDevNote = process.env.NODE_ENV !== "production" && channels.length === 0;

  return (
    <section id="chapter-contact" ref={ref} className={s.section} data-tone="future" aria-labelledby="contact-title">
      <span data-chapter="chapter-contact" style={{ position: "absolute", top: 0 }} />
      <div className={s.layout}>
        <div>
          <p className={s.eyebrow} data-rise="">
            Chapter IX · Contact
          </p>
          <h2 className={s.title} id="contact-title" data-rise="">
            Let&apos;s build what <em>comes next.</em>
          </h2>
          <p className={s.lede} data-rise="">
            Tell us about your project, your question or your idea.
          </p>
          {channels.length > 0 && (
            <ul className={s.channels}>
              {channels.map((c) => (
                <li key={c.key} data-rise="">
                  {c.href ? (
                    <a
                      className={s.channel}
                      href={c.href}
                      {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      onClick={() => track("contact_channel_click", { channel: c.key })}
                    >
                      <ContactIcon name={c.icon} className={s.channelIcon} />
                      <span className={s.channelLabel}>{c.label}</span>
                      <span className={s.channelValue}>{c.value}</span>
                    </a>
                  ) : (
                    <span className={s.channel}>
                      <ContactIcon name={c.icon} className={s.channelIcon} />
                      <span className={s.channelLabel}>{c.label}</span>
                      <span className={s.channelValue}>{c.value}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {showDevNote && (
            <p className={s.devNote} data-rise="">
              [DEVELOPER PLACEHOLDER] No contact channels configured. Add an email, phone, WhatsApp or social links in <code>src/config/site.config.ts</code> — empty values stay hidden.
            </p>
          )}
        </div>

        <div data-panel-wrap="" style={{ transformStyle: "preserve-3d" }}>
          <div className={s.panel} data-panel="">
            <ContactForm />
          </div>
        </div>
      </div>

      <footer className={s.footer}>
        <span>
          © {year} {content.companyName}
        </span>
        <button type="button" className={s.footerButton} onClick={() => scrollEngine.scrollTo(0, { duration: 3 })}>
          ↑ Back to the beginning
        </button>
      </footer>
    </section>
  );
}
