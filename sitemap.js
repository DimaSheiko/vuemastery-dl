// Check https://www.vuemastery.com/sitemap.xml For New Items
const https = require('https');
const fs = require('fs');

async function getSitemapUrls() {
  return new Promise(function (resolve, reject) {
    https.get(`https://www.vuemastery.com/sitemap.xml`, res => {
      res.setEncoding("utf8");
      let body = "";
      res.on("data", data => {
        body += data;
      });
      res.on("end", () => {
        const regex = /www.vuemastery.com\/courses\/(.*?)</giu;
        let m;
        let out = [];
        while ((m = regex.exec(body)) !== null) {
          if (m.index === regex.lastIndex) {
            regex.lastIndex++;
          }
          m.forEach((match) => {
            if (match.indexOf('<') < 0)
              out.push(`https://www.vuemastery.com/courses/` + match);
          });
        }
        resolve(out);
      });
      res.on('error', (e) => {
        reject(e)
      });
    });
  })
}

async function GetLinks() {
  let data = await getSitemapUrls();

  return data;
}
GetLinks().then(data => {
  console.log(data);
  fs.writeFileSync('sitemap.json', JSON.stringify(data));
}).catch(err => {
  console.log(err);
})
