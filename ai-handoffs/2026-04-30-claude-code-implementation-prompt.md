# Claude Code Implementation Prompt — AI Collaboration Pilot

**Date:** 2026-04-30  
**Author:** ChatGPT  
**Purpose:** Paste this into Claude Code to implement the agreed AI collaboration pilot from `2026-04-30-claude-code-feedback-v3.md`.

---

## Prompt

Claude Code, please implement the final AI collaboration operating model from:

```text
ai-handoffs/2026-04-30-claude-code-feedback-v3.md
```

Use the section titled:

```text
The final operating model — proposed contents of docs/ai-collab.md
```

Create this file:

```text
3dprintassistant/docs/ai-collab.md
```

## Requirements

1. **Use Claude Code v3 as the source of truth.**
   - Do not redesign the operating model.
   - Do not add new sections unless needed to fix broken links or obvious repo-path issues.

2. **Keep it to one file.**
   - Do not create `/ai-operating-model/`.
   - Do not create `/ai-reviews/`.
   - Do not create extra folders or dashboards.

3. **Validate paths before committing.**
   Check relative links against the actual repo structure, especially references like:

   ```text
   ../sessions/NEXT-SESSION.md
   ../../CLAUDE.md
   ai-handoffs/
   ```

   If a path is wrong, fix the path. Do not change the intent.

4. **Do not modify unrelated files.**
   Do not change:

   ```text
   CLAUDE.md
   ROADMAP.md
   workflow files
   session logs
   source code
   tests
   ```

   unless a minimal path/reference correction is truly necessary.

5. **Commit the result.**
   Suggested commit message:

   ```text
   docs: add lightweight AI collaboration pilot
   ```

---

## After implementation

Queue the first Codex review for the DQ-3 design decision:

```text
PA emission stub first vs. scraper-first
```

Use the review packet and scorecard from `docs/ai-collab.md`.

The purpose of the first review is to challenge the design decision before implementation, not to validate it after the fact.

---

## Success criteria

Implementation is successful when:

- `docs/ai-collab.md` exists.
- The file matches the final operating model from Claude Code v3, with only path corrections if needed.
- No unnecessary folders were created.
- No unrelated files were changed.
- The repo is ready for the first Codex review using the DQ-3 decision.

