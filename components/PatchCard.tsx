import type { CSSProperties } from "react";
import type { Patch } from "@/lib/types";
import styles from "@/app/page.module.css";
import { languageColour, textOn } from "./languages";

function formatStars(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

export default function PatchCard({ patch }: { patch: Patch }) {
  const colour = languageColour(patch.language);
  const files = patch.files_to_look_at.filter((f) => f && f.toLowerCase() !== "unknown");
  const match = Math.round(Math.max(0, Math.min(1, patch.score)) * 100);

  return (
    <article
      className={styles.patch}
      style={{ "--patch": colour, "--patch-text": textOn(colour) } as CSSProperties}
    >
      <header className={styles.patchHead}>
        <span className={styles.repo}>{patch.repo}</span>
        <span className={styles.stars} aria-label={`${patch.stars} stars`}>
          ★ {formatStars(patch.stars)}
        </span>
      </header>

      <h3 className={styles.patchTitle}>
        <a href={patch.url} target="_blank" rel="noopener noreferrer">
          {patch.title}
        </a>
      </h3>

      <div className={styles.badges}>
        <span className={styles.langBadge}>{patch.language}</span>
        <span className={`${styles.badge} ${styles[`diff_${patch.difficulty}`] ?? ""}`}>
          {patch.difficulty === "unknown" ? "difficulty ?" : patch.difficulty}
        </span>
        <span className={styles.badge}>{match}% match</span>
      </div>

      <p className={styles.summary}>{patch.summary}</p>

      {patch.first_steps.length > 0 && (
        <section>
          <h4 className={styles.subhead}>First steps</h4>
          <ol className={styles.steps}>
            {patch.first_steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </section>
      )}

      {files.length > 0 && (
        <section>
          <h4 className={styles.subhead}>Files to look at</h4>
          <ul className={styles.files}>
            {files.map((f) => (
              <li key={f}>
                <code>{f}</code>
              </li>
            ))}
          </ul>
        </section>
      )}

      <a className={styles.open} href={patch.url} target="_blank" rel="noopener noreferrer">
        Open issue →
      </a>
    </article>
  );
}
