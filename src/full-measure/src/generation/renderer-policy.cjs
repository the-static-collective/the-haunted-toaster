const VISUAL_LANGUAGE_RENDERER_PROFILE_ID = "toaster-raster-2";
const VISUAL_LANGUAGE_RENDERER_POLICY = "visual-language-v2";
const LEGACY_RENDERER_POLICY = "legacy-v1";

function rendererPolicyForProfile(profile) {
  return profile?.id === VISUAL_LANGUAGE_RENDERER_PROFILE_ID
    ? VISUAL_LANGUAGE_RENDERER_POLICY
    : null;
}

module.exports = {
  LEGACY_RENDERER_POLICY,
  VISUAL_LANGUAGE_RENDERER_POLICY,
  VISUAL_LANGUAGE_RENDERER_PROFILE_ID,
  rendererPolicyForProfile,
};
