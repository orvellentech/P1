import s from "./Antique.module.css";
import { Flourish } from "./AntiqueOrnaments";
import type { SiteContent } from "@/config/types";

/** Opening of the antique document — first seen through the logo portal. */
export default function AntiqueHeader({ content }: { content: SiteContent }) {
  return (
    <header className={s.header}>
      <p className={s.folio}>Chapter the Fourth</p>
      <Flourish className={s.ornament} />
      <h2 className={s.title} id="antique-title">
        {content.companyName}
      </h2>
      <p className={s.sub}>Being a true account of our beginnings</p>
    </header>
  );
}
