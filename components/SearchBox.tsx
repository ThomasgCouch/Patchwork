"use client";

import { useState, type FormEvent } from "react";
import styles from "@/app/page.module.css";

type Props = {
  onSearch: (username: string) => void;
  loading: boolean;
  initial?: string;
};

// Accepts "octocat", "@octocat" or "https://github.com/octocat"
function cleanUsername(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/^@/, "")
    .split("/")[0];
}

export default function SearchBox({ onSearch, loading, initial = "" }: Props) {
  const [value, setValue] = useState(initial);

  function submit(e: FormEvent) {
    e.preventDefault();
    const name = cleanUsername(value);
    if (name) onSearch(name);
  }

  return (
    <form className={styles.search} onSubmit={submit}>
      <label className={styles.inputWrap}>
        <span className={styles.prefix}>github.com/</span>
        <input
          className={styles.input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="your-username"
          aria-label="GitHub username"
          autoComplete="off"
          spellCheck={false}
          disabled={loading}
        />
      </label>
      <button className={styles.button} type="submit" disabled={loading || !value.trim()}>
        {loading ? "Stitching…" : "Find my patches"}
      </button>
    </form>
  );
}
