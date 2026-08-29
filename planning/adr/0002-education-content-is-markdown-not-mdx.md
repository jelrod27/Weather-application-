# Education content is markdown, not MDX

Guide prose lives in per-entry frontmatter markdown; the structured fields (altitude, pressure, category) stay in the `data/*.ts` objects; diagrams are referenced by id from a fixed registry rather than embedded as components. Prose is drafted from public-domain NOAA sources (NWS JetStream, the NWS Glossary) and passed through the existing `scripts/newsletter/` quality gates — `voice.ts`, `repetition.ts`, `narrative-fit.ts`, `validate-post.ts` — before human review on a PR.

MDX is the obvious choice for a diagram-heavy section and was rejected on purpose. Guide prose is model-drafted, and this repo already treats generated content as untrusted: `lib/blog/allowed-hosts.ts` exists specifically because an indirect prompt injection through news headlines could steer a draft into embedding tracker pixels or phishing links, and `rehype-sanitize` is the enforcement point. MDX would let a draft emit arbitrary JSX, walking straight past both. Markdown keeps generated content as *data*; a registry the model can only reference by id gives diagrams the same containment that `image-selection.ts` gives images.

## Consequences

Placing a diagram inside prose costs an indirection — an id and an anchor — instead of writing a component inline. That friction is the point. If Guides ever become entirely hand-authored, the security rationale disappears and this decision should be revisited rather than inherited.
