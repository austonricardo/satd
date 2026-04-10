function parseGithubRepoContext(urlString) {
  try {
    const url = new URL(urlString);
    if (url.hostname !== "github.com") return null;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const [owner, repo, section, maybeBranch] = parts;
    let branch = null;

    if (section === "tree" && maybeBranch) {
      branch = maybeBranch;
    }

    return {
      owner,
      repo,
      branch,
      repoUrl: `https://github.com/${owner}/${repo}`
    };
  } catch {
    return null;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "get_repo_context") {
    sendResponse({ repoContext: parseGithubRepoContext(window.location.href) });
    return true;
  }
  return false;
});
