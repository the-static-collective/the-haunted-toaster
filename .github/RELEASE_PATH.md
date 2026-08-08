Windows release publication is driven by `.github/workflows/haunted-toaster.yml`.

- Pull requests and branch pushes verify source and smoke renders.
- Manual workflow dispatch also builds the Windows artifact for testing.
- `v*` tags build Windows and publish a GitHub prerelease with the generated assets attached.

See `docs/RELEASING.md` for the release procedure.
