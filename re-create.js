const axios = require("axios");
const shell = require("shelljs");
const CANDIDATE_GITHUB_USERNAME = process.env.CANDIDATE_GITHUB_USERNAME;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const USER_NAME = "aizeorg";
const REPO_NAME = "finder-react";
const NEW_REPO_NAME = `finder-react-${CANDIDATE_GITHUB_USERNAME}`;

// Helper function to handle GitHub API requests
const githubApiRequest = async (url, method = "get", data = {}) => {
  const config = {
    method: method,
    url: url,
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
    },
    data: data,
  };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    throw new Error(`GitHub API Request Failed: ${error.message}`);
  }
};

// Create a new repository
async function createNewRepo() {
  const url = `https://api.github.com/user/repos`;
  const data = {
    name: NEW_REPO_NAME,
    description: `Forked version of ${REPO_NAME}`,
    private: true,
  };

  return await githubApiRequest(url, "post", data);
}

// Clone, set remote, and push
async function cloneAndPush() {
  // Insert the GitHub token into the repository URL for cloning
  const cloneCmd = `git clone https://${GITHUB_TOKEN}@github.com/${USER_NAME}/${REPO_NAME}.git`;

  // Use the token in the URL for setting the new remote
  const setRemoteCmd = `git remote set-url origin https://${GITHUB_TOKEN}@github.com/${USER_NAME}/${NEW_REPO_NAME}.git`;

  const pushCmd = `git push -u origin main`;

  if (shell.exec(cloneCmd).code !== 0) {
    throw new Error("Error cloning repository.");
  }

  shell.cd(REPO_NAME);

  if (shell.exec(setRemoteCmd).code !== 0) {
    throw new Error("Error setting remote repository.");
  }

  if (shell.exec(pushCmd).code !== 0) {
    throw new Error("Error pushing to new repository.");
  }

  // Remove local clone
  removeLocalClone();
}

function removeLocalClone() {
  shell.cd(".."); // Navigate back to the parent directory
  if (shell.rm("-rf", REPO_NAME).code !== 0) {
    throw new Error(`Error removing local clone of ${REPO_NAME}.`);
  }
}

// Move Issues from old repo to new repo
async function moveIssues() {
  const issuesUrl = `https://api.github.com/repos/${USER_NAME}/${REPO_NAME}/issues`;
  const issues = await githubApiRequest(issuesUrl);

  for (let issue of issues) {
    const newIssueData = {
      title: issue.title,
      body: issue.body,
      labels: issue.labels.map((label) => label.name),
      // Note: Handling of attachments and comments is more complex and may require additional logic
    };

    const newIssueUrl = `https://api.github.com/repos/${USER_NAME}/${NEW_REPO_NAME}/issues`;
    await githubApiRequest(newIssueUrl, "post", newIssueData);
  }
}

// Main Function
async function main() {
  try {
    console.log("Creating new repository...");
    await createNewRepo();

    console.log("Cloning, setting remote, and pushing...");
    await cloneAndPush();

    console.log("Moving issues...");
    await moveIssues();

    console.log("Finished!");
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

main();
