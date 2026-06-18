import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { validateGeneratedPost } from '../../scripts/newsletter/validate-post';

function writePost(markdown: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'newsletter-post-'));
  const filePath = path.join(dir, 'post.md');
  fs.writeFileSync(filePath, markdown, 'utf8');
  return filePath;
}

describe('validateGeneratedPost', () => {
  it('passes a Sunday post with matching severe, earthquake, and forecast imagery', () => {
    const filePath = writePost(`---
slug: this-week-in-weather-2026-06-14
title: This Week in Weather
date: 2026-06-14T20:48:00.887Z
author: 16bitbot
summary: Rearview and roadmap.
tags:
  - weekly-recap
heroImage: "/api/og/blog?title=This%20Week%20in%20Weather&type=severe"
readTime: 6
cadence: sunday_rearview
images_used:
  - mesocyclone-diagram
  - fault-types-usgs
  - goes16-water-vapor
image_audit:
  - "id=mesocyclone-diagram; lane=severe; anchor=The week's headline number; tags=severe_storms; caption=Schematic of mesocyclone structure within a supercell."
  - "id=fault-types-usgs; lane=earthquake; anchor=On the geophysical side; tags=earthquakes; caption=USGS diagram of normal, reverse, and strike-slip fault motion."
  - "id=goes16-water-vapor; lane=forecast; anchor=The dominant synoptic feature; tags=atmosphere_layers,tropical,tech_and_models; caption=GOES-16 mid-level water vapor — visualizes upper-tropospheric moisture and jet stream flow."
---

## Rearview

The week's headline number is 205 tornado warnings.

![Schematic of mesocyclone structure within a supercell.](https://www.spc.noaa.gov/faq/tornado/mesof.gif)
*NOAA SPC*

On the geophysical side, a M7.8 earthquake struck near a subduction zone.

![USGS diagram of normal, reverse, and strike-slip fault motion.](https://commons.wikimedia.org/wiki/Special:FilePath/Fault_types.svg?width=1280)
*USGS*

## Roadmap

The dominant synoptic feature is a ridge-trough pattern with precipitation chances.

![GOES-16 mid-level water vapor — visualizes upper-tropospheric moisture and jet stream flow.](https://cdn.star.nesdis.noaa.gov/GOES16/ABI/CONUS/09/1250x750.jpg)
*NOAA NESDIS*
`);

    const result = validateGeneratedPost(filePath);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.auditMarkdown).toContain('mesocyclone-diagram');
  });

  it('rejects placeholders and mismatched solar/drought imagery for a tornado and quake story', () => {
    const filePath = writePost(`---
slug: this-week-in-weather-2026-06-14
title: This Week in Weather
date: 2026-06-14T20:48:00.887Z
author: 16bitbot
summary: Rearview and roadmap.
tags:
  - weekly-recap
heroImage: https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0193.jpg
readTime: 6
cadence: sunday_rearview
images_used:
  - sdo-current-193
  - drought-cracked-soil
image_audit:
  - "id=sdo-current-193; lane=space; anchor=On the geophysical side; tags=space_weather; caption=Current Sun in 193 Å — outer corona, ~1 million K plasma."
  - "id=drought-cracked-soil; lane=forecast; anchor=The dominant synoptic feature; tags=agricultural,historical_events; caption=Cracked soil from prolonged drought."
---

## Rearview

The week's headline number is 205 tornado warnings.

On the geophysical side, a M7.8 earthquake struck near a subduction zone. Solar activity was negligible, with Kp index maxed at 0.

![Current Sun in 193 Å — outer corona, ~1 million K plasma.](https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0193.jpg)
*NASA SDO*

![A hallucinated map.](image1)

## Roadmap

The dominant synoptic feature is a ridge-trough pattern with precipitation chances.

![Cracked soil from prolonged drought.](https://commons.wikimedia.org/wiki/Special:FilePath/Drought.jpg?width=1280)
*USDA NRCS*
`);

    const result = validateGeneratedPost(filePath);
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toMatch(/non-absolute image URL/);
    expect(result.errors.join('\n')).toMatch(/solar\/space imagery/);
    expect(result.errors.join('\n')).toMatch(/drought\/agriculture imagery/);
  });

  it('passes a Wednesday post with audited topic imagery', () => {
    const filePath = writePost(`---
slug: how-radar-finds-a-storm
title: How Radar Finds a Storm
date: 2026-06-17T12:00:00.000Z
author: 16bitbot
summary: A radar explainer.
tags:
  - weather
  - severe
heroImage: https://www.spc.noaa.gov/faq/tornado/mesof.gif
readTime: 4
cadence: wednesday_topic
topic_slug: severe_storms
topic_title: Severe Storms
images_used:
  - mesocyclone-diagram
image_audit:
  - "id=mesocyclone-diagram; lane=severe_storms; anchor=## Inside the storm; tags=severe_storms; caption=Schematic of mesocyclone structure within a supercell."
---

## Inside the storm

A supercell can organize rotation before a tornado warning is issued.

![Schematic of mesocyclone structure within a supercell.](https://www.spc.noaa.gov/faq/tornado/mesof.gif)
*NOAA SPC*
`);

    const result = validateGeneratedPost(filePath);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.auditMarkdown).toContain('mesocyclone-diagram');
  });

  it('allows a Wednesday post with no body images and no placeholders', () => {
    const filePath = writePost(`---
slug: biometeorology-without-images
title: Biometeorology Without Images
date: 2026-06-17T12:00:00.000Z
author: 16bitbot
summary: A no-image deep dive.
tags:
  - weather
heroImage: "/api/og/blog?title=Biometeorology&type=weather"
readTime: 4
cadence: wednesday_topic
topic_slug: biometeorology
topic_title: Biometeorology
images_used: []
---

## The body forecast

Heat, humidity, wind, and sun angle can change how weather feels to a human body.
`);

    const result = validateGeneratedPost(filePath);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.auditMarkdown).toContain('No catalog images embedded');
  });

  it('rejects a Wednesday post with images_used but no image audit', () => {
    const filePath = writePost(`---
slug: radar-without-audit
title: Radar Without Audit
date: 2026-06-17T12:00:00.000Z
author: 16bitbot
summary: A radar explainer.
tags:
  - weather
heroImage: https://www.spc.noaa.gov/faq/tornado/mesof.gif
readTime: 4
cadence: wednesday_topic
topic_slug: severe_storms
topic_title: Severe Storms
images_used:
  - mesocyclone-diagram
---

## Inside the storm

A supercell can organize rotation before a tornado warning is issued.

![Schematic of mesocyclone structure within a supercell.](https://www.spc.noaa.gov/faq/tornado/mesof.gif)
*NOAA SPC*
`);

    const result = validateGeneratedPost(filePath);
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toMatch(/missing image_audit/);
  });

  it('rejects pollen and marine filler images in an urban climate post', () => {
    const filePath = writePost(`---
slug: urban-climate-mismatch
title: Urban Climate Mismatch
date: 2026-06-17T12:00:00.000Z
author: 16bitbot
summary: A heat-island explainer.
tags:
  - urban-climate
heroImage: https://commons.wikimedia.org/wiki/Special:FilePath/Urban_heat_island_%28Celsius%29.png?width=1280
readTime: 4
cadence: wednesday_topic
topic_slug: urban_climate
topic_title: Urban Climate
images_used:
  - pollen-grains-sem
  - wave-breaking
image_audit:
  - "id=pollen-grains-sem; lane=urban_climate; anchor=## Why Cities Run Hot; tags=biometeorology; caption=Diverse pollen grains imaged by scanning electron microscopy."
  - "id=wave-breaking; lane=urban_climate; anchor=## Why Cities Run Hot; tags=marine; caption=Large breaking wave at Santa Cruz, California."
---

## Why Cities Run Hot

Cities replace evapotranspiring surfaces with asphalt, concrete, and roofs. The urban heat island peaks overnight during heat waves.

![Diverse pollen grains imaged by scanning electron microscopy.](https://commons.wikimedia.org/wiki/Special:FilePath/Misc_pollen.jpg?width=1280)
*Dartmouth Electron Microscope Facility / PD*

![Large breaking wave at Santa Cruz, California.](https://commons.wikimedia.org/wiki/Special:FilePath/Big_wave_breaking_in_Santa_Cruz.jpg?width=1280)
*NOAA / Wikimedia*
`);

    const result = validateGeneratedPost(filePath);
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toMatch(/pollen\/biometeorology imagery/);
    expect(result.errors.join('\n')).toMatch(/marine imagery/);
  });

  it('allows temperature outlook imagery in an urban climate post', () => {
    const filePath = writePost(`---
slug: urban-climate-temperature-outlook
title: Urban Climate Temperature Outlook
date: 2026-06-17T12:00:00.000Z
author: 16bitbot
summary: A heat-island explainer.
tags:
  - urban-climate
heroImage: https://commons.wikimedia.org/wiki/Special:FilePath/Urban_heat_island_%28Celsius%29.png?width=1280
readTime: 4
cadence: wednesday_topic
topic_slug: urban_climate
topic_title: Urban Climate
images_used:
  - cpc-temp-outlook
image_audit:
  - "id=cpc-temp-outlook; lane=urban_climate; anchor=## Why Cities Run Hot; tags=biometeorology,urban_climate,tech_and_models; caption=NOAA CPC monthly temperature outlook — probabilistic anomalies."
---

## Why Cities Run Hot

Cities replace evapotranspiring surfaces with asphalt, concrete, and roofs. The urban heat island peaks overnight during heat waves.

![NOAA CPC monthly temperature outlook — probabilistic anomalies.](https://www.cpc.ncep.noaa.gov/products/predictions/long_range/lead01/off01_temp.gif)
*NOAA CPC*
`);

    const result = validateGeneratedPost(filePath);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects a Wednesday placeholder image before PR creation', () => {
    const filePath = writePost(`---
slug: placeholder-wednesday
title: Placeholder Wednesday
date: 2026-06-17T12:00:00.000Z
author: 16bitbot
summary: Placeholder test.
tags:
  - weather
heroImage: "/api/og/blog?title=Placeholder&type=weather"
readTime: 4
cadence: wednesday_topic
topic_slug: atmosphere_layers
topic_title: Atmosphere Layers
images_used: []
---

## The invisible layer

The boundary layer controls haze, gusts, and afternoon mixing.

![A hallucinated weather image.](placeholder)
`);

    const result = validateGeneratedPost(filePath);
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toMatch(/non-absolute image URL/);
  });
});
