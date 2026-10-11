# News imagery fixtures

Retrieved 2026-10-11T20:04:16.525Z from official public NOAA feeds.

- SPC: https://www.spc.noaa.gov/products/spcacrss.xml (unaltered feed).
- NWS: https://api.weather.gov/alerts/active?severity=Severe,Extreme&urgency=Immediate,Expected with Atom Accept header. XML reserialized with only the first High Wind, Freeze, and Flash Flood Warning entries retained; provider values unchanged.

Tests also construct explicitly synthetic malformed, month-boundary, and mismatched-image cases.
