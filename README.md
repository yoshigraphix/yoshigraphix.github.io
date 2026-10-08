# yoshigraphix.github.io

## Flood Level Lab prototype

Personal Projects entry: `work.html#personal-projects`; runnable page: `work/flood-level.html`.

Serve this directory with `python3 -m http.server 8765 --bind 127.0.0.1`, then visit
http://127.0.0.1:8765/work/flood-level.html. There is no build step, API key, runtime
framework, or runtime elevation-service request. Use an HTTP server rather than file://.

The bundled terrain is centered at the user-supplied coordinates with an 804.672 m
(half-mile) radius. This precise location is present in the source/data and visible
in the page. Obtain the owner's approval before pushing this branch to the public
repository or deploying it. Publishing a branch also exposes these coordinates.

### Data and method

`assets/data/flood-terrain.json` includes source tile URLs, access date, center,
radius, sampling method, and attribution. Four zoom-14 Mapzen/AWS Terrarium tiles
were decoded before bilinear resampling to an 81 × 81 grid (~20 m spacing).
The renderer retains triangles wholly inside the radius; the boundary is therefore
slightly inset and approximate. Local coordinate conversion is a neighborhood-scale
approximation. 3× vertical exaggeration only affects display, not numerical comparisons.

`python3 scripts/sample-flood-terrain.py` regenerates the grid (requires Pillow and
network access). The script contains the same precise center as the dataset.
Run mathematical/data checks with `node --test tests/flood-math.test.mjs`.

The horizontal water plane is clipped against triangles. Disconnected low pockets
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
