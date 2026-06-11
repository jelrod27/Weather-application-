> Archived 2026-06-11: the AI assistant feature was removed from the codebase; preserved for context if the feature returns.

# AI assistant UX — plan and rollout

Branch: `feat/ai-assistant-ux`

## Goals

- Chat-style UX: readable prose, smoother streaming, multiline input.
- **Personal context** from profile + saved city so vague questions have a default place.
- Trust: server-backed clear, fresh rate limit, sidebar matches tools.

## Implemented in this branch

| Item | Notes |
|------|--------|
| Personal context | `userContext` from `useAuth()` profile + `bitweather_city` fallback; validated on API and injected into system prompt. |
| Clear chat | `DELETE /api/chat` clears Supabase; trash button awaits it then clears UI. |
| Rate limit | Refetch after each completed assistant turn (`onFinish`). |
| Markdown | `react-markdown` for assistant messages. |
| Input | Textarea; Enter sends, Shift+Enter newline. |
| Quick actions / Try asking | One-shot send via `pendingSend` from `/ai`. |
| `?prompt=` | Auto-sends once (ref-guarded). |
| Sidebar | Volcanic row shows **Soon** until a tool exists. |
| Prompts | Personalities aligned with concise default, deeper on request; system prompt allows light Markdown. |
| Throttle | `experimental_throttle: 50` on `useChat` for smoother stream updates. |
| **Supabase AI memory** | Table `user_ai_memory` (notes + `recent_locations` JSON array). Loaded each request into the system prompt. Tools: `save_user_memory_fact`, `save_user_location_interest`, `replace_user_memory_notes`, `clear_user_ai_memory`. |

### Apply the `user_ai_memory` migrations

1. Run `supabase/migrations/20260321_user_ai_memory.sql` (table + RLS).
2. Run `supabase/migrations/20260322_user_ai_memory_atomic_rpc.sql` (atomic append/location RPCs used by the API).

Requires `SUPABASE_SERVICE_ROLE_KEY` on the API (same as chat history).

**Note:** Clearing chat history (`DELETE /api/chat`) does **not** wipe long-term memory; the model can clear memory via `clear_user_ai_memory` when the user asks.

## Follow-ups

- Optional: background summarization of threads into memory (extra model call on `onFinish`).
- `@tailwindcss/typography` for richer markdown defaults.
- Geolocation “near me” with explicit permission UX.
- Personality-only hook on dashboard (avoid full `useChat` there).
- Volcano tool + restore live label.

## Verify locally

- `npm run lint`
- `npm run build` (Node >= 20.9)
- `npm run test:e2e` when touching `/ai`
