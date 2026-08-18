const path = require("node:path");
const base = require("./candidate-session.cjs");

function sameBinding(left, right) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  if (left.specimenId && right.specimenId) return left.specimenId === right.specimenId;
  if (left.path && right.path) return path.resolve(left.path) === path.resolve(right.path);
  return false;
}

function createCandidateSession(options = {}) {
  const session = base.createCandidateSession(options);
  let video = null;

  function noteVideo(binding) {
    if (!binding) return clearVideo();
    const next = structuredClone(binding);
    if (!sameBinding(video, next)) session.clearCandidates();
    video = next;
    return structuredClone(video);
  }

  function clearVideo() {
    if (video) session.clearCandidates();
    video = null;
    return null;
  }

  function state() {
    return {
      video: video ? structuredClone(video) : null,
    };
  }

  return {
    ...session,
    clearVideo,
    noteVideo,
    state,
  };
}

module.exports = {
  ...base,
  createCandidateSession,
};
