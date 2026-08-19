"use client";

import type { BlogBlock, UnparsedBlock } from "@/lib/blog-blocks";
import {
  parseMarkdownBody,
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

  function convert(as: UnparsedAs) {
    onChange(resolveUnparsed(block.raw, as, block.id));
  }

  function reparse() {
    const { blocks, issues } = parseMarkdownBody(block.raw);
    if (!blocks.length) {
      onChange({
        ...block,
        reason: "Nothing mapped to a blog block. Edit the snippet or convert it.",
      });
      return;
    }
    const next = blocks.map((item) => {
      if (item.type !== "unparsed") return item;
      const extra = issues.find((row) => row.blockId === item.id);
      return extra ? { ...item, reason: extra.message } : item;
    });
    onReplace(next);
  }

  return (
    <div className="admin-unparsed">
      <p className="admin-warn">{block.reason}</p>
      <label>
        Leftover snippet
        <textarea
          rows={8}
          value={block.raw}
          onChange={(event) => onChange({ ...block, raw: event.target.value })}
        />
      </label>
      <p className="admin-muted">
        Parsed sections stay as they are. Edit this leftover until it matches a heading, list,
        quote, image, or diagram fence, then parse it again — or convert it to a block type.
      </p>
      <div className="admin-unparsed-actions">
        <button type="button" onClick={reparse}>
          Parse again
        </button>
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
