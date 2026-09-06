# 16-Bit Weather

16-Bit Weather helps people understand current conditions and protect the places they care about from hazardous weather.

## Alerting Language

**Subscriber**:
A verified recipient of weather alerts with a durable identity independent of any optional 16-Bit Weather account.
_Avoid_: User, account holder

**Protected Place**:
A user-confirmed geographic coordinate monitored for matching Warning Events. A Protected Place is active, paused, or deleted.
_Avoid_: Saved location, alert location

**Management Session**:
Temporary, revocable authority to manage one Subscriber's protection after email ownership is verified.
_Avoid_: Login, account session

**Associated Account**:
An optional one-to-one link that gives a 16-Bit Weather account cross-device access to a Subscriber without transferring ownership of its protection.
_Avoid_: Owner account, Subscriber account

**Warning Event**:
One authoritative NWS warning across issuance, material updates, cancellation, and expiry.
_Avoid_: Alert, notification

**Source Message**:
One immutable CAP message received from the authoritative warning source.
_Avoid_: Alert, Warning Event

**Event Action**:
The effect a Source Message has on one Warning Event and geographic segment.
_Avoid_: Update, message

**Place Match**:
The recorded result and evidence for whether one Event Action covers one version of a Protected Place.
_Avoid_: Location match, alert match

**Freshness State**:
The current trust state of warning ingestion: fresh, delayed, or unavailable.
_Avoid_: API status, cache age

**Material Change**:
A Warning Event change significant enough to warrant proactive Delivery, such as changed threat, coverage, or official lifecycle status.
_Avoid_: Update, revision

**Safety Template**:
Versioned, independently reviewed fallback guidance used only when a Source Message lacks adequate official instructions.
_Avoid_: Generated advice, alert copy

**Delivery**:
One attempt to communicate a Warning Event lifecycle change to a Subscriber through a channel.
_Avoid_: Alert, message, notification

## Warning Ranking Rules

How any surface orders Warning Events for a place. Settled in #518 and shipped with the local-first Warning Center (#535, #536); `splitLocalWarnings` and `compareWarningPriority` in `lib/warnings/local-ranking.ts` are the one shared implementation. Today they apply the event-type and CAP steps; Place Match method and certainty as sort keys are tracked as follow-ups.

**Two lanes**:
The public lane ranks Warning Events for the location a page is viewing (search, GPS, or a pin). The protection lane ranks Warning Events per Protected Place. Never merge every Protected Place into one public list.
_Avoid_: Combined list, all my alerts

**Local-lane sort**:
Inside one lane, in this order. 1. Place Match method: polygon, then point-active, then unresolved. 2. Event type: Tornado Warning, then Flash Flood Warning, then Severe Thunderstorm Warning, then everything else. 3. CAP fields: severity (Extreme, Severe, Moderate, Minor), then urgency (Immediate, Expected, Future), then certainty (Observed, Likely, Possible). 4. Tie-break: most recent Material Change, then issued time, then the stable Warning Event id.
_Avoid_: Newest first, alphabetical

**Nearby strip**:
Warning Events that do not cover the place but sit within `NEARBY_WARNING_KM` of it. Shown below the local lane, ordered by the same ladder and then by distance. Never counted as local.
_Avoid_: Local, on you

**National stream**:
Everything else, ordered by the same ladder without Place Match method: event type, severity, urgency, certainty, then time.
_Avoid_: Elsewhere list, other alerts

**Active only**:
Ended, expired, and cancelled Warning Events leave every ranked list and go to lifecycle history. Expiry removes an event; it never sorts one. No all-clear copy.
_Avoid_: Recently ended, all clear

**Unresolved is not local**:
A Place Match whose method is unresolved never enters the local lane. It belongs in the national stream or a coverage-unknown strip.
_Avoid_: Probably local, best guess

**No magnitude in rank**:
EF rating, crest height, and hail size are display only. Missing or late magnitude never changes order.
_Avoid_: Biggest first

## Education Language

**Entry**:
One row in a source encyclopedia database describing a single cloud, weather system, or phenomenon. An Entry exists whether or not anything has been published about it.
_Avoid_: Record, item, topic

**Guide**:
A published, URL-addressable long-form page written about one or more Entries. Guides are the education surface's search assets.
_Avoid_: Detail page, article, featured entry

**Entry Guide**:
A Guide about exactly one Entry.
_Avoid_: Detail page, entry page

**Collection Guide**:
A Guide about several Entries that share a theme, written when no single Entry warrants a page of its own.
_Avoid_: Roundup, category page, listicle

**Atlas**:
A browsable index over one set of Entries. An Atlas lists Entries; it does not explain them at depth.
_Avoid_: Encyclopedia, section, library

**Hub**:
The single landing page for the education surface.
_Avoid_: Learn page, index, education home

**Notation**:
The standardized meteorological symbol and color system used to draw weather — frontal symbols, isobars, wind barbs, station models. Notation carries meaning, so it does not vary with presentation.
_Avoid_: Chart style, diagram theme, icon set
