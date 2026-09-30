import Experience from "@/components/Experience";
import { siteConfig } from "@/config/site.config";

export default function Page() {
  return (
    <>
      <Experience />
      {/* Content for visitors and crawlers without JavaScript. */}
      <noscript>
        <main style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px", color: "#eee", fontFamily: "serif", lineHeight: 1.6 }}>
          <h1>{siteConfig.companyName}</h1>
          <p>{siteConfig.intro}</p>
          <h2>Mission</h2>
          <p>{siteConfig.mission}</p>
          <h2>Vision</h2>
          <p>{siteConfig.vision}</p>
          <h2>{siteConfig.about.heading}</h2>
          {siteConfig.about.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {siteConfig.contact.email && (
            <p>
              <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>
            </p>
          )}
        </main>
      </noscript>
    </>
  );
}
