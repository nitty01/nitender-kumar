"use client";

import type { BlogBlock, UnparsedBlock } from "@/lib/blog-blocks";
import { structureGuide } from "@/lib/blog-markdown-template";
import {
  reparseUnparsedSnippet,
  resolveUnparsed,
  suggestedUnparsedAs,
  UNPARSED_AS,
  type UnparsedAs,
} from "@/lib/import-blog-markdown";

export function UnparsedBlockFields({
  block,
  onChange,
  onReplace,
}: {
  block: UnparsedBlock;
  onChange: (block: BlogBlock) => void;
  onReplace: (blocks: BlogBlock[]) => void;
}) {
  const suggested = suggestedUnparsedAs(block.raw);
  const guide = block.expected ? structureGuide(block.expected) : undefined;

  function convert(as: UnparsedAs) {
    onChange(resolveUnparsed(block.raw, as, block.id));
  }

  function insertExample() {
    const sample = block.example || guide?.example;
    if (!sample) return;
    onChange({ ...block, raw: sample });
  }

  function reparse() {
    const { blocks, issues } = reparseUnparsedSnippet(block.raw);
    if (!blocks.length) {
      const first = issues[0];
      onChange({
        ...block,
        reason: first?.message ?? "Nothing mapped to a blog block.",
        hint: first?.hint ?? block.hint,
        expected: first?.expected ?? block.expected,
        code: first?.code ?? block.code,
      });
      return;
    }
    const next = blocks.map((item) => {
      if (item.type !== "unparsed") return item;
      const extra = issues.find((row) => row.blockId === item.id);
      if (!extra) return item;
      return {
        ...item,
        reason: extra.message,
        hint: extra.hint ?? item.hint,
        expected: extra.expected ?? item.expected,
        code: extra.code ?? item.code,
        line: extra.line ?? item.line,
      };
    });
    onReplace(next);
  }

  return (
    <div className="admin-unparsed">
      <div className="admin-parse-error">
        <p className="admin-warn">{block.reason}</p>
        {block.line ? <p className="admin-muted">Source line {block.line}</p> : null}
        {block.expected ? (
          <p className="admin-muted">
            Expected: <strong>{guide?.label ?? block.expected}</strong>
            {block.code ? ` · ${block.code}` : ""}
          </p>
        ) : null}
        {block.hint ? <p className="admin-parse-hint">{block.hint}</p> : null}
      </div>
      <label>
        Edit snippet
        <textarea
          rows={8}
          value={block.raw}
          onChange={(event) => onChange({ ...block, raw: event.target.value })}
        />
      </label>
      {guide ? (
        <details className="admin-parse-example">
          <summary>Structure guide — {guide.label}</summary>
          <ul className="admin-import-issues">
            {guide.rules.map((rule) => (
              <li key={rule} className="admin-muted">
                {rule}
              </li>
            ))}
          </ul>
          <pre className="admin-template-preview">{guide.example}</pre>
        </details>
      ) : null}
      <div className="admin-unparsed-actions">
        <button type="button" onClick={reparse}>
          Parse again
        </button>
        {block.example || guide?.example ? (
          <button type="button" onClick={insertExample}>
            Insert example
          </button>
        ) : null}
        {UNPARSED_AS.map((item) => (
          <button
            key={item.as}
            type="button"
            className={item.as === suggested ? "is-suggested" : undefined}
            onClick={() => convert(item.as)}
          >
            {item.as === suggested ? `${item.label} (suggested)` : item.label}
          </button>
        ))}
        <button type="button" className="admin-danger" onClick={() => onReplace([])}>
          Discard
        </button>
      </div>
    </div>
  );
}
