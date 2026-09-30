import s from "./About.module.css";
import { devPlaceholder } from "@/lib/placeholder";
import type { Founder } from "@/config/types";

function initials(name: string) {
  const clean = name.replace(/[\[\]]/g, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export default function FounderCard({ founder, index }: { founder: Founder; index: number }) {
  const number = String(index + 1).padStart(2, "0");
  const hasImage = !!founder.image.trim();
  return (
    <article className={s.card} data-founder="">
      <span className={s.index} data-index="" aria-hidden="true">
        {number}
      </span>
      <div className={s.cardInner} data-tilt="">
        <figure className={s.portrait}>
          <div className={s.imageWrap} data-image-wrap="">
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={s.image} data-image="" src={founder.image} alt={`Portrait of ${founder.name}`} loading="lazy" decoding="async" />
            ) : (
              <div className={`${s.image} ${s.placeholder}`} data-image="" role="img" aria-label={`Placeholder portrait for ${founder.name}`}>
                <span className={s.monogram}>{initials(founder.name)}</span>
                <span className={s.placeholderLabel}>[FOUNDER PHOTO]</span>
              </div>
            )}
          </div>
        </figure>
        <div className={s.meta}>
          <p className={s.role} data-meta="" {...devPlaceholder(founder.role)}>
            {founder.role}
          </p>
          <h3 className={s.name} data-name="" {...devPlaceholder(founder.name)}>
            {founder.name}
          </h3>
          <p className={s.desc} data-meta="" {...devPlaceholder(founder.description)}>
            {founder.description}
          </p>
        </div>
      </div>
    </article>
  );
}
