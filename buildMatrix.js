const Semver = require("semver");
const getJSON = (...args) =>
  new Promise((resolve, reject) => {
    const transport = args[0].startsWith("https")
      ? require("https")
      : require("http");

    transport
      .get(...args, (res) => {
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
        res.on("data", (chunk) => {
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

const loadGitHubReleases = (repo) =>
  getJSON(`https://api.github.com/repos/${repo}/releases`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "hertzg/docker-verdaccio-multiarch",
    },
  });

const { EXCLUDE_TAGS = "" } = process.env;
const blacklist = EXCLUDE_TAGS.split(",").filter((s) => s && s.length);

// TODO(@hertzg): Use semver for range blocks instead of starts with
//                See also: https://regex101.com/r/vkijKf/1/
const isBlacklisted = (tag) =>
  blacklist.some((exclude) => tag.startsWith(exclude));

const filterReleases = (releases) =>
  releases
    .filter((release) => release.tag_name.startsWith("v"))
    .filter((release) => !isBlacklisted(release.tag_name))
    // Only leave semver parsable (loosely)
    .filter((release) => Semver.clean(release.tag_name, { loose: true }));

const groupReleases = (repo) =>
  loadGitHubReleases(repo)
    .then(filterReleases)
    .then((releases) =>
      releases
        .map((release) => ({
          revision: release.tag_name,
          version: Semver.clean(release.tag_name),
          semver: Semver.parse(Semver.clean(release.tag_name)),
        }))
        .sort(({ version: a }, { version: b }) => Semver.rcompare(a, b))
        .reduceRight(
          (acc, { semver, revision }) => ({
            ...acc,
            latest: revision,
            [`${semver.major}`]: revision,
            [`${semver.major}.${semver.minor}`]: revision,
            [semver.format()]: revision,
            [revision]: revision,
          }),
          {}
        )
    )
    .then((revisionsByVersionGroup) =>
      Object.entries(revisionsByVersionGroup).reduce((acc, [tag, revision]) => {
        if (acc[revision]) {
          acc[revision].push(tag);
        } else {
          acc[revision] = [tag];
        }
        return acc;
      }, {})
    );

const tagToFlag = (tag) => `--tag ${mirror}:${tag}`;

const convertGroupsToBuildArgs = (builds) =>
  Object.entries(builds)
    .sort(([a], [b]) => Semver.rcompare(a, b))
    .map(([revision, tags]) => [revision, tags.map(tagToFlag).join(" ")]);

if (process.argv.length < 4) {
  console.error(`usage: ${__filename} <origin> <mirror>`);
  process.exit(1);
}

const [origin, mirror] = process.argv.slice(2);

groupReleases(origin)
  .then(convertGroupsToBuildArgs)
  .then((entries) => ({
    include: entries.map((entry) => ({ revision: entry[0], args: entry[1] })),
  }))
  .then(JSON.stringify)
  .then(console.log);
