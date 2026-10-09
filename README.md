# yoshigraphix.github.io

## Flood Level Lab prototype

Personal Projects entry: `work.html#personal-projects`; runnable page: `work/flood-level.html`.

Serve this directory with `python3 -m http.server 8765 --bind 127.0.0.1`, then visit
http://127.0.0.1:8765/work/flood-level.html. There is no build step, API key, runtime
elevation-service request. Three.js 0.180.0 and OrbitControls are vendored locally
under their MIT license. Use an HTTP server rather than file://.

The bundled terrain is centered at the user-supplied coordinates with an 1609.344 m
(one-mile) radius. This precise location is present in the source/data and visible
in the page. Obtain the owner's approval before pushing this branch to the public
repository or deploying it. Publishing a branch also exposes these coordinates.

### Data and method

`assets/data/flood-terrain.json` includes source tile URLs, access date, center,
radius, sampling method, and attribution. Zoom-14 Mapzen/AWS Terrarium tiles
were decoded before bilinear resampling to an 161 × 161 grid (~20 m spacing).
The renderer retains triangles wholly inside the radius; the boundary is therefore
slightly inset and approximate. Local coordinate conversion is a neighborhood-scale
approximation. The new WebGL scene uses true vertical scale.

`python3 scripts/sample-flood-terrain.py` regenerates the grid (requires Pillow and
network access). The script contains the same precise center as the dataset.
Run mathematical/data checks with `node --test tests/flood-math.test.mjs`.

The horizontal water disk intersects the terrain through WebGL depth testing. Disconnected low pockets
are included: no hydrologic connectivity, drainage, river slope, or hydraulic flow
is modeled. The baseline defaults to the lowest sampled point inside the circle,
not an observed river water level. The center readout is terrain, not a floor or
building survey. Vertical datum and local source accuracy have not been verified.
Do not interpret the reference-to-center difference as the rise needed to flood a house.
A useful next phase needs a verified river/gauge reference and compatible vertical
datums, higher-resolution local terrain, surveyed building elevation, and hydrologic
connectivity or a validated hydraulic model.

Sources: https://registry.opendata.aws/terrain-tiles/ and
https://github.com/tilezen/joerd/blob/master/docs/attribution.md . United States 3DEP
and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey.
The derived crop is not endorsed by USGS.

### Validation

Four Node tests cover unit conversion and baseline arithmetic, water-plane clipping,
flat/equality cases, and the bundled area/data. Browser checks cover loading,
0 and +120 ft readouts, camera controls, invalid reference input, and mobile layout.
No changes have been deployed by this prototype's implementation workflow.


## Free neighborhood reconstruction

The current page uses `assets/js/flood-neighborhood.js`. The earlier canvas renderer
is preserved in `flood-level.js` but is no longer loaded by the page.

- `neighborhood-aerial.jpg`: 2048px USDA NAIP image from USGS, draped over terrain.
  Exact export bounds and source URL are in `aerial-source.json`. Capture date is
  not verified; imagery is not live. No Google imagery is used.
- `neighborhood-osm.json`: small filtered OSM API map extract. © OpenStreetMap
  contributors, ODbL 1.0. This derived extract remains available under ODbL:
  https://opendatacommons.org/licenses/odbl/1-0/ . The source URL is in the file.
- `illustrative-scenery.json`: 62 approximate roof-center locations interpreted
  from the NAIP image, with invented house dimensions and roof shapes, no generated trees. These are display approximations,
  not detected/surveyed tree locations or building footprints. Bridge deck elevation
  is approximated from its road endpoints. None of this scenery affects flood maths.
- `assets/vendor`: Three.js 0.180.0 and OrbitControls, MIT license included. The only
  change to upstream OrbitControls is a relative local import for Three.js.

Drag to orbit, scroll/pinch to zoom, right-drag to pan. Buttons offer a close-up and
whole-area view. Keyboard arrows rotate, +/- zoom; sliders provide rotation/tilt.
The inner-models checkbox leaves the real aerial/terrain visible for comparison.
WebGL2 is required; load errors are reported rather than showing invented terrain.
All current scene assets load locally without a subscription, billing account or API key.


### One-mile extent update

The radius is now 1609.344 m (one mile; two miles across). The 161×161 elevation
grid retains approximately 20 m spacing. Aerial imagery covers the same expanded
bounds at the service's supported 2048×2048 export size (~1.6 m per image pixel).
All generated trees were removed from the data and renderer. Houses and road/bridge
ribbons are limited to the inner 0.33 miles (about 531 m); beyond that the surface is
textured terrain only. The original house positions remain in local meter coordinates
and are not rescaled with the wider imagery. Boundary and north markers are annotations.
The Whole area view and zoom range now accommodate the expanded area.
