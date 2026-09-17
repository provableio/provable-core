#!/usr/bin/env node
// Keeps CHANGELOG.md in step with package.json.
//
//   release-changelog.js check          fail unless "Unreleased" has content
//   release-changelog.js release        move "Unreleased" under the current
//                                       package.json version, dated today
//   release-changelog.js notes <ver>    print the section for <ver> (used by
//                                       the publish workflow for the GitHub
//                                       release body)
//
// `npm version` runs the release form through the "version" script, after it
// has bumped package.json and before it commits.
const fs = require("fs");
const path = require("path");

const REPO = "https://github.com/provableio/provable-core";
const file = path.join(__dirname, "..", "CHANGELOG.md");
const [mode, arg] = process.argv.slice(2);

const changelog = fs.readFileSync(file, "utf8");
const heading = /^## \[([^\]]+)\](?: - (\d{4}-\d{2}-\d{2}))?$/gm;

function sections() {
  const result = [];
  let match;
  while ((match = heading.exec(changelog))) {
    result.push({ name: match[1], start: match.index, bodyStart: match.index + match[0].length });
  }
  result.forEach((s, i) => {
    const end = i + 1 < result.length ? result[i + 1].start : changelog.search(/^\[Unreleased\]:/m);
    s.body = changelog.slice(s.bodyStart, end === -1 ? undefined : end).trim();
  });
  return result;
}

function fail(message) {
  console.error(`release-changelog: ${message}`);
  process.exit(1);
}

function unreleased() {
  const section = sections()[0];
  if (!section || section.name !== "Unreleased") fail("CHANGELOG.md must start with an [Unreleased] section");
  if (!section.body) fail("the [Unreleased] section is empty; describe the change before releasing");
  return section;
}

if (mode === "check") {
  unreleased();
} else if (mode === "notes") {
  const version = (arg || "").replace(/^v/, "");
  const section = sections().find((s) => s.name === version);
  if (!section) fail(`no CHANGELOG section for ${version}`);
  process.stdout.write(section.body + "\n");
} else if (mode === "release") {
  const { version } = require(path.join(__dirname, "..", "package.json"));
  unreleased();
  const all = sections();
  if (all.some((s) => s.name === version)) fail(`CHANGELOG.md already has a ${version} section`);
  const previous = all[1] && all[1].name;
  const today = new Date().toISOString().slice(0, 10);

  let next = changelog.replace(
    /^## \[Unreleased\]$/m,
    `## [Unreleased]\n\n## [${version}] - ${today}`
  );
  next = next.replace(
    /^\[Unreleased\]: .*$/m,
    `[Unreleased]: ${REPO}/compare/v${version}...HEAD\n[${version}]: ` +
      (previous ? `${REPO}/compare/v${previous}...v${version}` : `${REPO}/releases/tag/v${version}`)
  );
  fs.writeFileSync(file, next);
  console.log(`CHANGELOG.md: released ${version} (${today})`);
} else {
  fail("usage: release-changelog.js check | release | notes <version>");
}
