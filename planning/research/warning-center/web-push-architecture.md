# Warning Center Web Push Architecture

Research completed for [Choose browser and PWA push architecture](https://github.com/jelrod27/Weather-application-/issues/514). Facts were verified against primary sources on August 6, 2026.

## Decision

Use standards-based Web Push with:

- a root-scoped service worker;
- one browser installation record per `PushSubscription`;
- a long-lived VAPID key pair;
- encrypted `aes128gcm` payloads;
- a durable, at-least-once Delivery queue;
- idempotency keyed by Warning Event transition and installation;
- email as a parallel fallback channel.

A Subscriber and a browser installation are separate concepts. Push permission authorizes an origin to display notifications; it does not verify email ownership or Subscriber identity.

## Compatibility

- Chromium and Firefox support standards-based Web Push on desktop and Android over HTTPS.
- Safari supports Web Push on macOS.
- iOS and iPadOS support Web Push only for web apps added to the Home Screen. The manifest must use `standalone` or `fullscreen` display.
- Unsupported or embedded browsers must fall back to email and the in-app Warning Center.

Browser push is supplemental. Acceptance by a browser push service does not prove display or user attention, so the two-minute product target cannot be guaranteed for this channel.

## Permission and identity rules

- Never request notification permission on page load.
- Explain the protected-place benefit before an explicit enable action.
- Store every installation independently under the verified Subscriber.
- Give installation credentials authority only over that installation, not Subscriber-wide preferences or Protected Places.
- Treat push endpoints as sensitive capability URLs: restrict access and never log them.
- Reconcile the browser subscription with server state on app launch and foreground return.
- Retire expired endpoints and repair rotation idempotently.

## Delivery rules

- Keep encrypted payloads below roughly 3 KB of UTF-8 JSON, under the standards-safe 3,993-byte plaintext maximum.
- Include enough information to display without a follow-up request: event type, lifecycle status, concise place label, timestamps, guidance, and an opaque navigation URL.
- Use `Urgency: high` for the selected life-safety events.
- Set TTL to the remaining useful lifetime of the Warning Event.
- Use an opaque topic and a stable notification tag so material updates replace stale state.
- Retry transient failures with bounded backoff, honor `Retry-After`, and delete expired subscriptions.

## Repository gap

16-Bit Weather is not currently a PWA. It has no web app manifest, service worker, push integration, VAPID configuration, or complete 192×192 and 512×512 install icon set. These are prerequisites for browser push, particularly on iOS.

## Recommended processing seam

`Warning Event transition → spatial match → durable Delivery job → idempotent installation attempt → browser push service`

The queue must assume at-least-once execution and deduplicate each `(warningEventId, lifecycleState, installationId)` attempt.

## Remaining decisions

- Queue provider and delivery retry policy.
- Supported browser and OS floor.
- Inactive-installation retention and per-Subscriber device limit.
- VAPID custody, backup, compromise, and rotation.
- Whether payloads name a Protected Place or use a generic label.
- TTL by lifecycle transition.
- Physical-device test matrix and freshness measurement.

## Primary sources

- [W3C Push API](https://www.w3.org/TR/2025/WD-push-api-20250806/)
- [RFC 8030: Generic Event Delivery Using HTTP Push](https://datatracker.ietf.org/doc/rfc8030/)
- [RFC 8291: Message Encryption for Web Push](https://datatracker.ietf.org/doc/rfc8291/)
- [RFC 8292: VAPID](https://datatracker.ietf.org/doc/rfc8292/)
- [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [WebKit: Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Vercel Queues](https://vercel.com/docs/queues)
