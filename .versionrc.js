module.exports = {
  // Skip commit and tag, we will do these steps manually
  skip: {
    commit: true,
    tag: true,
  },
  header: `# Changelog\n\nAll notable changes to this project will be documented in this file. 🤘\n`,
  types: [
    { type: "feat", section: "🚀 Features" },
    { type: "fix", section: "🐛 Bug Fixes" },
    { type: "chore", hidden: true },
    { type: "docs", hidden: true },
    { type: "style", hidden: true },
    { type: "refactor", hidden: true },
    { type: "perf", hidden: true },
    { type: "test", hidden: true },
  ],
  commitUrlFormat:
    "https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/storage-api/commits/{{hash}}",
  issueUrlFormat:
    "https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/storage-api/pull-requests/{{id}}/overview",
  compareUrlFormat:
    "https://ec.europa.eu/cefdigital/code/projects/EBSI/repos/storage-api/compare/diff?targetBranch=refs%2Ftags%2F{{previousTag}}&sourceBranch=refs%2Ftags%2F{{currentTag}}&targetRepoId=245",
};
