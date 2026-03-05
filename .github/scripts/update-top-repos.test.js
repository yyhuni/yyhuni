const test = require("node:test");
const assert = require("node:assert/strict");

const { buildTopReposSection, replaceTopReposSection } = require("./update-top-repos");

test("buildTopReposSection 按 star 降序并忽略 fork", () => {
  const repos = [
    {
      name: "low",
      html_url: "https://github.com/yyhuni/low",
      description: "low repo",
      stargazers_count: 1,
      forks_count: 0,
      fork: false,
      updated_at: "2026-03-01T00:00:00Z",
    },
    {
      name: "forked",
      html_url: "https://github.com/yyhuni/forked",
      description: "forked repo",
      stargazers_count: 999,
      forks_count: 20,
      fork: true,
      updated_at: "2026-03-01T00:00:00Z",
    },
    {
      name: "high",
      html_url: "https://github.com/yyhuni/high",
      description: "high repo",
      stargazers_count: 10,
      forks_count: 2,
      fork: false,
      updated_at: "2026-03-02T00:00:00Z",
    },
  ];

  const section = buildTopReposSection(repos, { username: "yyhuni", topN: 2 });

  assert.match(section, /### Top 2 by Stars/);
  assert.match(section, /high/);
  assert.match(section, /low/);
  assert.doesNotMatch(section, /forked/);
  assert.ok(section.indexOf("high") < section.indexOf("low"));
});

test("replaceTopReposSection 只替换标记区间", () => {
  const before = [
    "# title",
    "",
    "<!-- TOP_REPOS_START -->",
    "old content",
    "<!-- TOP_REPOS_END -->",
    "",
    "tail",
  ].join("\n");

  const after = replaceTopReposSection(before, "new content");

  assert.match(after, /# title/);
  assert.match(after, /new content/);
  assert.doesNotMatch(after, /old content/);
  assert.match(after, /tail/);
});
