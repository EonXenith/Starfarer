# Starfarer

A browser-based 3D space exploration game built on Three.js. Pick a ship, spawn at Earth, and explore the galaxy.

## Running

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

## Notes

- Discovery state (visited systems, scanned systems, visited planets) lives only in memory and resets on page reload.
- Sol planet textures from solarsystemscope.com (CC-BY-4.0). If textures are missing, procedural fallback colors are used.
- No currency, cargo, fuel, or trade — pure exploration.

## Adding Systems

To add a new star system, add one entry to `data.js`'s `starSystems` array. No other code changes needed.
