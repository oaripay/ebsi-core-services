// @ts-check

const projectUrl =
  "https://ec.europa.eu/digital-building-blocks/code/projects/EBSI/repos/core-services";

const getReleaseLine = async (
  /** @type {import('@changesets/types').NewChangesetWithCommit} */
  changeset,
  /** @type {import('@changesets/types').VersionType} */
  _type,
) => {
  const [firstLine, ...futureLines] = changeset.summary
    .split("\n")
    .map((l) => l.trimRight());

  let returnVal = `- ${
    changeset.commit
      ? `[${changeset.commit}](${projectUrl}/commits/${changeset.commit}): `
      : ""
  }${firstLine}`;

  if (futureLines.length > 0) {
    returnVal += `\n${futureLines.map((l) => `  ${l}`).join("\n")}`;
  }

  return returnVal;
};

const getDependencyReleaseLine = async (
  /** @type {import('@changesets/types').NewChangesetWithCommit[]} */
  changesets,
  /** @type {import('@changesets/types').ModCompWithPackage[]} */
  dependenciesUpdated,
) => {
  if (dependenciesUpdated.length === 0) return "";

  const changesetLinks = changesets.map(
    (changeset) =>
      `- Updated dependencies${
        changeset.commit
          ? ` [${changeset.commit}](${projectUrl}/commits/${changeset.commit})`
          : ""
      }`,
  );

  const updatedDepenenciesList = dependenciesUpdated.map(
    (dependency) => `  - ${dependency.name}@${dependency.newVersion}`,
  );

  return [...changesetLinks, ...updatedDepenenciesList].join("\n");
};

/** @type {import('@changesets/types').ChangelogFunctions} */
const defaultChangelogFunctions = {
  getReleaseLine,
  getDependencyReleaseLine,
};

module.exports = defaultChangelogFunctions;
