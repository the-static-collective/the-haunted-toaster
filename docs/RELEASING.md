# Haunted Toaster Windows releases

The tagged release path is intentionally small and mechanical.

## Release a Windows alpha

1. Ensure `main` is green.
2. Set `src/full-measure/package.json` to the release version.
3. Push a matching `v*` tag, for example `v0.5.0-alpha.1`.
4. The `Haunted Toaster proof and package` workflow will:
   - run the canonical verification suite;
   - build the unsigned Windows NSIS installer and portable executable;
   - upload the Windows build as a workflow artifact;
   - create a prerelease on GitHub with the generated Windows assets attached.

Manual `workflow_dispatch` runs still build and upload the Windows artifact, but do not create a GitHub Release. This keeps accidental manual builds from becoming published versions.

## Version invariant

The Git tag and `src/full-measure/package.json` version should match apart from the leading `v` so packaged filenames and the GitHub Release identify the same build.
