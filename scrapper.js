const fs = require("fs");
const fsp = require("fs").promises;
const puppeteer = require("puppeteer");

const username = process.env.USERNAME;
const password = process.env.PASSWORD;

async function login(page) {
    await page.goto("https://vuemastery.com");

    await page.waitForSelector('button[data-test="loginBtn"]');

    await page.click('button[data-test="loginBtn"]');

    await page.waitForSelector('input[data-test="inputEmail"]');
    await page.type('input[data-test="inputEmail"]', username);

    await page.waitForSelector('input[data-test="inputPassword"]');
    await page.type('input[data-test="inputPassword"]', password);

    await page.click('button[data-test="signSubmit"]');
    await page.waitForNavigation();
}

async function getCourses(sitemap) {
    const courses = {};

    sitemap.forEach((url) => {
        const course = url.split("/courses/")[1].split("/")[0];

        if (courses[course]) {
            courses[course].push(url);
        } else {
            courses[course] = [url];
        }
    });

    return courses;
}

async function extractVideoUrl(page, url) {
    await page.goto(url);

    await page.waitForSelector('iframe[data-ready="true"]');

    const iframeSrcs = await page.evaluate(() => {
        const iframes = document.getElementsByTagName("iframe");

        const srcs = Array.from(iframes).map((iframe) => iframe.src);

        return srcs;
    });

    const vimeoSrc = iframeSrcs.find((src) => src.includes("vimeo.com"));

    // const waitTime = Math.floor(Math.random() * 5000) + 1000;
    // await new Promise((resolve) => setTimeout(resolve, waitTime));

    return vimeoSrc;
}

function formatCourseName(course) {
    return course
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

async function saveUrls(course, urls) {
    if (!urls.length) {
        return;
    }

    const folder = `./data/${course}`;
    const dataFile = `${folder}/data.txt`;
    const readmeFile = `${folder}/Readme.md`;

    try {
        await fsp.mkdir(folder, { recursive: true });
    } catch (err) {
        console.error("Error creating folder:", err);
        return;
    }

    const urlsText = urls.map(({ videoUrl }) => videoUrl).join("\n") + "\n";

    try {
        await fsp.writeFile(dataFile, urlsText);
    } catch (err) {
        console.error("Error appending URLs to data.txt:", err);
        return;
    }

    const formattedCourseName = formatCourseName(course);

    const readmeContent =
        `# ${formattedCourseName}\n[View on VueMastery.com](https://vuemastery.com/courses/${course})\n${urls
            .map(({ lesson, videoUrl }) => `* [Lesson ${lesson}](${videoUrl})`)
            .join("\n")}` + "\n";

    try {
        await fsp.writeFile(readmeFile, readmeContent);
    } catch (err) {
        console.error("Error writing to Readme.md:", err);
        return;
    }
}

fs.readFile("sitemap.json", "utf8", async (err, data) => {
    if (err) {
        console.error("Error al leer sitemap.json:", err);
        return;
    }

    try {
        let launchOptions = {
            headless: false,
            args: ["--start-maximized"],
        };

        const browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();

        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent(
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36"
        );

        await login(page);

        const sitemap = JSON.parse(data);

        const courses = await getCourses(sitemap);

        for (const course of Object.keys(courses)) {
            const urls = [];

            for (let index = 0; index < courses[course].length; index++) {
                const url = courses[course][index];
                const videoUrl = await extractVideoUrl(page, url);

                const lesson = (index + 1).toString().padStart(2, "0");

                urls.push({ lesson, videoUrl });
            }

            await saveUrls(course, urls);
        }

        await browser.close();
    } catch (error) {
        console.error("Error al analizar sitemap.json:", error);
    }
});
