// Netlify Function: saves scores.json to the GitHub repo.
// The GitHub token lives in Netlify's environment variables (GITHUB_TOKEN),
// so it is never sent to the browser.
// Committing to the repo makes Netlify rebuild the site with the new scores.

const REPO = process.env.GITHUB_REPO || "tymwarburton/tut--1";
const BRANCH = process.env.GITHUB_BRANCH || "main";
const FILE_PATH = "scores.json";
const API_URL = "https://api.github.com/repos/" + REPO + "/contents/" + FILE_PATH;

// Only allow { "week": { "crown": n, "opp": n } } with sensible numbers
function cleanScores(data) {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return null;
  }
  const weeks = Object.keys(data);
  if (weeks.length > 60) {
    return null;
  }

  const clean = {};
  for (const week of weeks) {
    const score = data[week];
    if (!/^[1-9][0-9]?$/.test(week) || typeof score !== "object" || score === null) {
      return null;
    }
    const crown = score.crown;
    const opp = score.opp;
    const isValid = function (n) {
      return Number.isInteger(n) && n >= 0 && n <= 99;
    };
    if (!isValid(crown) || !isValid(opp)) {
      return null;
    }
    clean[week] = { crown: crown, opp: opp };
  }
  return clean;
}

function reply(status, body) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: { "Content-Type": "application/json" },
  });
}

export default async function (request) {
  if (request.method !== "POST") {
    return reply(405, { error: "Use POST" });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return reply(500, { error: "GITHUB_TOKEN is not set on Netlify" });
  }

  let scores;
  try {
    scores = cleanScores(await request.json());
  } catch (error) {
    scores = null;
  }
  if (!scores) {
    return reply(400, { error: "Scores were not in the right format" });
  }

  const headers = {
    Authorization: "Bearer " + token,
    Accept: "application/vnd.github+json",
    "User-Agent": "crown-scores-site",
  };

  // GitHub needs the current file's "sha" to update it
  const current = await fetch(API_URL + "?ref=" + BRANCH, { headers: headers });
  let sha;
  if (current.ok) {
    sha = (await current.json()).sha;
  } else if (current.status !== 404) {
    return reply(502, { error: "Could not read scores.json from GitHub" });
  }

  const text = JSON.stringify(scores, null, 2) + "\n";
  const update = await fetch(API_URL, {
    method: "PUT",
    headers: headers,
    body: JSON.stringify({
      message: "Update scores",
      content: Buffer.from(text).toString("base64"),
      branch: BRANCH,
      sha: sha,
    }),
  });

  if (update.status === 409) {
    return reply(409, { error: "Someone else saved at the same time, please try again" });
  }
  if (!update.ok) {
    return reply(502, { error: "GitHub would not save the file" });
  }

  return reply(200, { ok: true, scores: scores });
}
