const getJSON = (...args) =>
  new Promise((resolve, reject) => {
    const transport = args[0].startsWith("https")
      ? require("https")
      : require("http");

    transport
      .get(...args, res => {
        const { statusCode } = res;
        const contentType = res.headers["content-type"];

        let error;
        if (statusCode !== 200) {
          error = new Error("Request Failed.\n" + `Status Code: ${statusCode}`);
        } else if (!/^application\/json/.test(contentType)) {
          error = new Error(
            "Invalid content-type.\n" +
              `Expected application/json but received ${contentType}`
          );
        }

        if (error) {
          // consume response data to free up memory
          res.resume();
          reject(error);
          return;
        }

        res.setEncoding("utf8");
        let rawData = "";
        res.on("data", chunk => {
          rawData += chunk;
        });
        res.on("end", () => {
          try {
            const parsedData = JSON.parse(rawData);
            resolve(parsedData);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });

const loadGitHubReleases = repo =>
  getJSON(`https://api.github.com/repos/${repo}/releases`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "hertzg/docker-verdaccio-multiarch"
    }
  });

const isLatestRelease = release => !release.prerelease && !release.draft;

const { EXCLUDE_TAGS = "" } = process.env;
const blacklist = EXCLUDE_TAGS.split(",");

const filterReleases = releases =>
  releases
    .filter(release => release.tag_name.startsWith("v"))
    .filter(release => !blacklist.includes(release.tag_name));

const convertReleasesToImageTags = repo =>
  loadGitHubReleases(repo)
    .then(filterReleases)
    .then(releases =>
      releases.reduce(
        (acc, release) => {
          if (!acc.latest && isLatestRelease(release)) {
            acc.latest = release;
          } else {
            acc.other.push(release);
          }
          return acc;
        },
        { latest: null, other: [] }
      )
    );

const releaseToTagFlag = release =>
  `--tag ${mirror}:${
    release.tag_name
  } --tag ${mirror}:${release.tag_name.replace(/^v/, "")}`;

const convertToBuildMap = ({ latest, other }) => [
  [latest.tag_name, `--tag ${mirror}:latest ${releaseToTagFlag(latest)}`],
  ...other.map(release => [release.tag_name, releaseToTagFlag(release)])
];

if (process.argv.length < 4) {
  console.error(`usage: ${__filename} <origin> <mirror>`);
  process.exit(1);
}

const [origin, mirror] = process.argv.slice(2);

convertReleasesToImageTags(origin)
  .then(convertToBuildMap)
  .then(entries => entries.map(entry => JSON.stringify(entry)).join("\n"))
  .then(console.log);
