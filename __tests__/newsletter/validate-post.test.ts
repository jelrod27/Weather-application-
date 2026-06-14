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
});
