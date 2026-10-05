# First-visit weather start

**Status:** Shipped — [PR #637](https://github.com/jelrod27/Weather-application-/pull/637), merge `53bd65b`.

## Problem

A visitor without a saved city needs an immediate way to find local weather. The large Get Started panel was rejected in favor of a compact location action and search field. Footer and city lists should not fill the first-visit screen.

## Required behavior

1. Replace the large Get Started panel with a compact “Use my location” action beside the search guidance. The field says “Search for a location…”. The server-rendered shell also has concise guidance, without a large weather skeleton.
2. With no remembered city and automatic location enabled, request browser location access once on arrival. The browser controls its native prompt. If it blocks or dismisses the request, allow retry through the location action. An unanswered request recovers after 15 seconds and ignores any late result.
3. City search remains usable while location permission or detection is pending. No IP lookup should silently substitute for device location. A late device response must not overwrite a manually chosen city, including after navigation away.
4. If device location is denied or weather loading fails, show one clear error and keep manual search and location retry available.
5. Hide the homepage footer, city lists, and discovery sections until weather has loaded. Other pages retain their normal footers. Returning visitors with a usable saved/default city continue loading it automatically and regain the normal homepage content.

## Verification

- Verify one automatic location request, usable search while pending, and no visible footer or city lists before weather.
- Exercise denial, location success, and a late device response after choosing a city.
- Check saved-city restoration and footer behavior on the home and another page.
- Check desktop and narrow mobile layouts for the compact first-visit state.
