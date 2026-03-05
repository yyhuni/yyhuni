const fs = require("node:fs");
const path = require("node:path");

const START_MARKER = "<!-- TOP_REPOS_START -->";
const END_MARKER = "<!-- TOP_REPOS_END -->";

function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(input) {
  if (!input) return "-";
  return String(input).replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim() || "-";
}

function formatDate(dateText) {
  if (!dateText) return "-";
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toISOString().slice(0, 10);
}

function buildTopReposSection(repos, options = {}) {
  const username = options.username || "";
  const topN = Number(options.topN || 6);

  const picked = repos
    .filter((repo) => !repo.fork && !repo.archived && !repo.private)
    .filter((repo) => String(repo.name).toLowerCase() !== String(username).toLowerCase())
    .sort((a, b) => {
      if (b.stargazers_count !== a.stargazers_count) {
        return b.stargazers_count - a.stargazers_count;
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    })
    .slice(0, topN);

  if (picked.length === 0) {
    return `### Top ${topN} by Stars\n\n_No public repositories found._`;
  }

  const lines = [
    `### Top ${topN} by Stars`,
    "",
    "| Repository | Stars | Forks | Updated | Description |",
    "| --- | ---: | ---: | --- | --- |",
  ];

  for (const repo of picked) {
    lines.push(
      `| [${normalizeText(repo.name)}](${repo.html_url}) | ${repo.stargazers_count} | ${repo.forks_count} | ${formatDate(repo.updated_at)} | ${normalizeText(repo.description)} |`
    );
  }

  return lines.join("\n");
}

function replaceTopReposSection(readmeContent, sectionContent) {
  const replacement = `${START_MARKER}\n${sectionContent}\n${END_MARKER}`;

  if (readmeContent.includes(START_MARKER) && readmeContent.includes(END_MARKER)) {
    const pattern = new RegExp(
      `${escapeRegex(START_MARKER)}[\\s\\S]*?${escapeRegex(END_MARKER)}`,
      "m"
    );
    return readmeContent.replace(pattern, replacement);
  }

  const appendix = [
    "",
    "## `/top_repos_by_stars`",
    "",
    replacement,
    "",
  ].join("\n");

  return `${readmeContent.trimEnd()}\n${appendix}`;
}

async function fetchUserRepos(username, token) {
  const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?type=owner&per_page=100&sort=updated`;
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "profile-readme-top-repos-updater",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GitHub API request failed: ${response.status} ${message}`);
  }
  return response.json();
}

async function main() {
  const username = process.env.PROFILE_USERNAME || process.env.GITHUB_REPOSITORY_OWNER;
  if (!username) {
    throw new Error("PROFILE_USERNAME is required");
  }

  const readmePath = path.resolve(process.cwd(), process.env.README_PATH || "README.md");
  const topN = Number(process.env.TOP_REPOS_LIMIT || 6);
  const token = process.env.GITHUB_TOKEN;

  const readmeContent = fs.readFileSync(readmePath, "utf8");
  const repos = await fetchUserRepos(username, token);
  const section = buildTopReposSection(repos, { username, topN });
  const updatedReadme = replaceTopReposSection(readmeContent, section);

  if (updatedReadme !== readmeContent) {
    fs.writeFileSync(readmePath, updatedReadme, "utf8");
    console.log("README updated.");
  } else {
    console.log("README already up to date.");
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  START_MARKER,
  END_MARKER,
  buildTopReposSection,
  replaceTopReposSection,
};
