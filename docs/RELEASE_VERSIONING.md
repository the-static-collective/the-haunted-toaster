# Release versioning

Haunted Toaster prerelease tags use semantic prerelease versions such as `v0.5.0-alpha.1`.

The application version in `src/full-measure/package.json` must match the tag without the leading `v`. Electron Builder uses that application version in generated filenames, so this invariant prevents a release tag from publishing misleadingly named binaries.
