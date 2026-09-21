# Sudden Death — Season 1 patched source

This package contains the repaired `src/` tree from the supplied source archive.

## Major fixes

- Fixed checkpoint restoration and legacy checkpoint/save compatibility.
- Added a real player-facing checkpoint restore action in the menu.
- Added persistent food/water pressure to the HUD and made starvation reachable.
- Made Echoes obtainable through actual story interactions and retained their existing spend systems.
- Made canned food, bottled water, first-aid, flashlight, knife, extinguisher, and bat all obtainable/usable within the season.
- Made zombie combat distinguish bat / knife / extinguisher damage and wording.
- Added three distinct horned infected battle silhouettes instead of reusing one enemy image for every encounter.
- Prevented infection from selecting a dead character or the active romance partner.
- Made romance protection affect the first murder outcome and added a consistent first-victim state.
- Prevented later choices from offering dead romance characters.
- Made Mira's late fate depend on earlier trust, investigation, health handling, and suspicion state.
- Added additional evidence/Echo interactions and made late-game evacuation routes depend on preparation made the previous night.
- Repaired invalid references to the false-accusation and suspected endings.
- Updated the final confession text so it reflects the actual first victim rather than assuming one fixed victim.
- Removed a duplicated sentence in the first-death scene.
- Made blackout flashlight use consume a charge.
- Normalized state for older saves so the new resource/checkpoint fields do not break continuation.
- Kept the existing legacy renderer and shared core state model intact.

## Verification

- JavaScript syntax checks pass for the modified story/core/art/endings modules.
- 3,000 randomized story runs with combat wins found all 10 endings, with no missing scenes, dead ends, or runtime errors.
- 3,000 randomized runs with occasional combat losses also found all 10 endings.
- Static destination check: all 97 story scenes have valid string destinations for choices and combat win/lose routes.
- Character-state sampling found no offered dead-character choices in the sampled reachable states.
- Resource sampling confirmed zero-resource states can occur; Echoes and all seven item types can be obtained.

## Build note

The supplied archive contained the `src/` tree only; it did not include the project's package/build files (for example `package.json`, Vite configuration, or an HTML entry file). Because of that, the complete production build could not be run from this archive alone. The patched source itself was syntax-checked and exercised through source-level story simulation.
