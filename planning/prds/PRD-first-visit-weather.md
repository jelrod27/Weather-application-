# First-visit weather start

## Problem

A visitor without a saved city can see an empty weather area followed by city links. The current location flow avoids a browser permission prompt, tries IP location, and can fail without explaining the next step. The small “PRESS START” link and disabled location button in the search form do not clearly present the two ways to begin.

## Required behavior

1. The home page gives a new visitor a prominent “Get started” introduction before weather data loads, including in the server-rendered loading state.
2. The introduction offers “Use my location” and “Search for a city.” The latter moves focus to the existing city search. Device location permission is requested only after the visitor chooses “Use my location,” unless the browser has already granted permission.
3. A visitor with no remembered city and no prior location permission can use either choice immediately. Automatic IP lookup must not block the first choice or silently replace it.
4. If device location is denied or weather loading fails, the introduction and manual search remain available. Show the existing error message rather than stranding the visitor.
5. Returning visitors with a usable saved/default city continue loading it automatically. Visitors who previously granted device location may continue automatic detection. The city links remain available below the main experience.

## Verification

- Exercise a fresh browser with no stored city and browser permission at `prompt`; check both choices and keyboard focus.
- Exercise denied device location and confirm manual city search remains available.
- Check a returning visitor with saved weather still reaches the weather display without seeing a persistent start prompt.
- Check desktop and narrow mobile layouts for the first-visit state.
