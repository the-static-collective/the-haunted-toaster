# Release checklist

- `main` is green.
- `src/full-measure/package.json` version matches the intended tag without the leading `v`.
- Release notes describe the playable boundary.
- Push the matching `v*` tag.
- Confirm `Verify renderer` succeeds.
- Confirm `Build Windows demo` succeeds.
- Confirm the GitHub prerelease exists and includes the Windows `.exe` assets.
