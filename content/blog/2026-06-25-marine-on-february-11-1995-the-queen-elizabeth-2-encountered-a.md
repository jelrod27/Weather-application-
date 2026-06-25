---
slug: marine-on-february-11-1995-the-queen-elizabeth-2-encountered-a
title: "Marine Weather: On February 11, 1995, the *Queen Elizabeth 2* encountered a wave estimated at 29 meters — roug"
date: 2026-06-25T22:18:33.459Z
author: 16bitbot
summary: "On February 11, 1995, the *Queen Elizabeth 2* encountered a wave estimated at 29 meters — roughly the height of a nine-s"
tags:
  - marine
  - weather
  - science
  - tech-and-models
  - historical-events
  - severe-storms
heroImage: https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS/02/1250x750.jpg
readTime: 5
cadence: wednesday_topic
opener_hash: 7de06c00
key_phrases:
  - QE2 rogue wave encounter shifting sailor mythology into research problem
  - waves exceeding twice the significant wave height of the surrounding sea
  - three weeks of synthetic aperture radar data found more than ten waves exceeding 25 meters globally
  - wave energy focused by the Agulhas Current off South Africa
  - warm moist air moving over cold upwelled water driving San Francisco fog season
  - "nearshore water 12–14°C while inland valleys bake above 38°C"
  - departures in the window between a deteriorating forecast and the issuance of an advisory
  - misplacing a deepening low by 200 miles sending a vessel into unacceptable conditions
  - wave period and ship length interact badly enough to stress the hull
  - ensemble-based routing presenting a spread of possible outcomes rather than a single track
similarity_max: 0
similarity_judge: claude-sonnet-4-6
model_used: claude-sonnet-4-6
images_used:
  - wave-breaking
  - supercomputer-rack
  - goes16-visible-conus
image_audit:
  - "id=wave-breaking; lane=marine; anchor=That is not a gap that better computers alone will close.; tags=marine; caption=Large breaking wave at Santa Cruz, California."
  - "id=supercomputer-rack; lane=marine; anchor=Ensemble-based routing — which presents a spread of possible outcomes rather than a single track — addresses this, but adoption across the industry is uneven.; tags=tech_and_models,historical_events; caption=Cray-1 supercomputer — early generation of weather modeling hardware."
  - "id=goes16-visible-conus; lane=marine; anchor=the atmosphere and ocean are coupled, nonlinear, and only partially observed.; tags=severe_storms,tech_and_models; caption=GOES-16 visible-band view of the contiguous US."
spotlight_active: null
generation_retries: 1
word_count: 809
closer_used: natural-wrapup
topic_slug: marine
topic_title: Marine Weather
theme: "On February 11, 1995, the *Queen Elizabeth 2* encountered a wave estimated at 29 meters — roughly the height of a nine-s"
---

On February 11, 1995, the *Queen Elizabeth 2* encountered a wave estimated at 29 meters — roughly the height of a nine-story building — in the North Atlantic near Newfoundland. The ship survived. The encounter helped shift rogue waves from sailor mythology into an active research problem. Nothing major has moved on marine forecasting this week, which makes it a reasonable moment to examine what the science actually knows, and where it still falls short.

## What Builds a Wave — and What Breaks the Model

Standard wave forecasting runs on three variables: wind speed, fetch (the unobstructed water surface over which wind acts), and duration. Given sustained 40-knot winds over 500 nautical miles of open ocean for 24 hours, numerical models can predict significant wave height with reasonable accuracy. The National Weather Service's wave forecasting suite ingests global wind fields and outputs sea state predictions used by everyone from cargo operators to the Coast Guard.

Significant wave height is a statistical term — it represents the average of the highest one-third of waves in a given sea state. A forecast of 4-meter seas means some waves will be 6 meters, a few will be larger. That distribution is well understood under normal conditions.

Rogue waves are not normal conditions. Defined formally as waves that exceed twice the significant wave height of the surrounding sea, they appear at frequencies that classical wave statistics — which assume a Gaussian distribution — cannot explain. Satellite radar data collected since the early 2000s has confirmed they are far more common than the old models predicted: one analysis of three weeks of synthetic aperture radar data found more than ten waves exceeding 25 meters globally. The leading physical explanations involve nonlinear wave-wave interactions and, in some coastal regions, wave energy focused by underwater topography or opposing currents like the Agulhas Current off South Africa. No operational forecast system reliably predicts individual rogue waves. That is not a gap that better computers alone will close.

![Large breaking wave at Santa Cruz, California.](https://commons.wikimedia.org/wiki/Special:FilePath/Big_wave_breaking_in_Santa_Cruz.jpg?width=1280)
*NOAA / Wikimedia*

## Fog, Sea Breezes, and the Coastal Boundary Layer

Coastal weather operates on a different scale than open-ocean sea state, and it affects far more people. Advection fog — the type that makes San Francisco's summer mornings famous — forms when warm, moist air moves over cold upwelled water. The California coast's fog season runs roughly May through September, driven by the same upwelling that makes the nearshore water 12–14°C while inland valleys bake above 38°C. That temperature contrast is also the engine of the sea breeze: differential heating between land and water creates a pressure gradient that drives onshore flow in the afternoon and offshore flow at night. For small-craft operators, the practical consequence is a wind forecast that changes character by the hour — glassy conditions at 0700, 20-knot onshore flow by 1400, dying off again after sunset.

Gale warnings (34–47 knots) and small-craft advisories (winds or gusts exceeding 21 knots, or seas above a threshold that varies by region) are the formal products that translate sea state forecasts into operational guidance. The fatality record for recreational boating correlates strongly with departures that happen in the window between a deteriorating forecast and the issuance of an advisory — which is to say, the forecast products work when people check them.

## Weather Routing and the Economics of Sea State

Commercial shipping burns roughly 300 metric tons of fuel per day on a large container vessel at sea speed. A weather router's job is to find the path between departure and destination that minimizes fuel consumption, transit time, or both — threading between low-pressure systems, avoiding head seas that force speed reductions, and staying clear of regions where wave period and ship length interact badly enough to stress the hull.

Modern routing software ingests ensemble forecast data and outputs optimized tracks updated every six to twelve hours. The fuel savings on a single transpacific voyage can reach $150,000 or more. The discipline has its own failure modes: a router working from a deterministic forecast that misplaces a deepening low by 200 miles can send a vessel directly into conditions the ship's master would never have accepted with full information. Ensemble-based routing — which presents a spread of possible outcomes rather than a single track — addresses this, but adoption across the industry is uneven.

![Cray-1 supercomputer — early generation of weather modeling hardware.](https://commons.wikimedia.org/wiki/Special:FilePath/Cray-1-deutsches-museum.jpg?width=1280)
*Wikimedia Commons*

The thread connecting rogue wave research, coastal fog prediction, and commercial weather routing is the same one running through most of applied meteorology: the atmosphere and ocean are coupled, nonlinear, and only partially observed. Better sensors and higher-resolution models keep narrowing the uncertainty. They have not eliminated it, and the sea is not a forgiving place to find out where the remaining gaps are.

![GOES-16 visible-band view of the contiguous US.](https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS/02/1250x750.jpg)
*NOAA NESDIS*
