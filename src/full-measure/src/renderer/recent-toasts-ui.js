(function exposeRecentToastsUi(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!root) return;
  root.RecentToastsUI = api;
})(typeof window !== "undefined" ? window : null, () => Object.freeze({}));
