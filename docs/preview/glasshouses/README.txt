GLASSHOUSES: SUSAN'S SPOTLIGHT EXERCISE

Adapted at Andy Wilson's request from:
https://github.com/andystats/bleile-glasshouses
Source commit: 9311ef2a643ac51f6b2ada29d8135afdb49e5d38
The original three-study experience remains at:
https://andystats.github.io/bleile-glasshouses/

This embedded edition preserves the original spotlight, corner lamp, named
blue-bug repairs, coral concerns, geometry, materials, sound opt-in, reduced
motion behavior, keyboard controls and touch controls. The scene explicitly
uses Three.js PCFShadowMap, matching the renderer's former fallback.

Susan's scenario is configured in src/primer-config.js. It uses the primer's
existing 60-ding profile and ten available repairs: confounding -6,
measurement -2, sensitivity -2. Positivity remains at 8. The example compares
shorter versus conventional radiotherapy over five years. It is a separate
scenario from the standalone game's 24-to-19 example, not a rescaling of it.

The parent's spotlight.mjs validates messages by origin, exact iframe window,
and permitted score ranges. Game changes flow into the same profile used by
the star, editor, shared links and recorded assessment. A component receives
the evidence/design basis only after all its available repairs are complete.
Viewing or discovering a bug never changes scores. A manual edit or selected
preset closes the running game; restarting explicitly returns to 60. Loading
the 3D game is optional, and the profile controls remain available without it.

EDIT AND BUILD (Node 20+)
Edit src/ files, not generated index.html. From this directory:
  npm ci --ignore-scripts
  npm test
  npm run build
From the repository root:
  node tests/test_spotlight.mjs
Commit the rebuilt index.html with source changes. The pinned Three.js and
esbuild dependencies are bundled into the generated HTML; no runtime CDN or
network request is needed by the renderer. The parent integration is served
over HTTP/HTTPS, as part of the primer.

Upstream model/targeting tests run without the Susan override and preserve the
original game invariants. test_spotlight.mjs separately loads the actual Susan
configuration and validates its repairs and integration mapping.

The upstream Three.js license is preserved in THIRD_PARTY_LICENSES.txt and
embedded in the generated HTML. This adaptation does not assert a new license
for Andy's game code. Private emails, review packets and transcripts are not
included in this directory.
