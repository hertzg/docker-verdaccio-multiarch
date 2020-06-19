const HTTPS = require("https");

const getJSON = (...args) =>
  new Promise((resolve, reject) => {
    HTTPS.get(...args, (res) => {
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
    }).on("error", reject);
  });

if (process.argv.length < 4) {
  console.error(`usage: ${__filename} <origin> <mirror>`);
  process.exit(1);
}

const [origin, mirror] = process.argv.slice(2);

const loadDockerHubTagsNames = (repo) =>
  getJSON(
    `https://hub.docker.com/v2/repositories/${repo}/tags?page_size=9999`
  ).then((body) => body.results.map((r) => r.name));

Promise.all([loadDockerHubTagsNames(origin), loadDockerHubTagsNames(mirror)])
  .then(([originTags, mirrorTags]) => {
    return originTags.filter((tag) => !mirrorTags.includes(tag));
  })
  .then((diff) => console.log(diff.join(" ")))
  .catch((e) => {
    console.error(e);
    throw e;
  });
