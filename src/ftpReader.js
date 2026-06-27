const ftp = require("basic-ftp");
const fs = require("fs");
const db = require("./database.js");

const FTP_HOST = process.env.FTP_HOST;
const FTP_USER = process.env.FTP_USER;
const FTP_PASS = process.env.FTP_PASS;
const FTP_PATH = process.env.FTP_PATH || "/dayzxb/config";

let lastSize = 0;
let currentLog = null;

async function getFile(remotePath) {
    try {
        const client = new ftp.Client();
        client.ftp.verbose = false;

        await client.access({
            host: FTP_HOST,
            user: FTP_USER,
            password: FTP_PASS,
            secure: false
        });

        const tempFile = "ftp_temp.log";
        await client.downloadTo(tempFile, remotePath);
        client.close();

        return fs.readFileSync(tempFile, "utf8");
    } catch (err) {
        console.log("❌ FTP getFile error:", err.message);
        return null;
    }
}

async function getNewestADM() {
    const client = new ftp.Client();
    try {
        await client.access({
            host: process.env.FTP_HOST,
            port: process.env.FTP_PORT,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASS
        });

        const list = await client.list(process.env.FTP_PATH);

        const admFiles = list
            .filter(f => f.name.endsWith(".ADM"))
            .sort((a, b) => {
                const extract = name => {
                    const m = name.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/);
                    return m ? new Date(m[1], m[2] - 1, m[3], m[4], m[5], m[6]) : 0;
                };
                return extract(b.name) - extract(a.name);
            });

        return admFiles[0]?.name || null;

    } catch (err) {
        console.error("❌ getNewestADM error:", err.message);
        return null;
    } finally {
        client.close();
    }
}

async function startFTPWatcher() {
    console.log("⚡ FTP log watcher started (auto-switch, tail mode)...");

    setInterval(async () => {
        try {
            const client = new ftp.Client();
            client.ftp.verbose = false;

            await client.access({
                host: FTP_HOST,
                user: FTP_USER,
                password: FTP_PASS,
                secure: false
            });

            const list = await client.list(FTP_PATH);

            const admFiles = list
                .filter(f => f.name.endsWith(".ADM"))
                .sort((a, b) => b.name.localeCompare(a.name));

            if (admFiles.length === 0) {
                console.log("❌ No ADM logs found in FTP folder.");
                client.close();
                return;
            }

            const newest = admFiles[0].name;

            if (currentLog !== newest) {
                console.log(`📄 Switched to newest ADM log: ${newest}`);
                currentLog = newest;
                lastSize = 0;
            }

            const remoteFile = `${FTP_PATH}/${currentLog}`;
            const tempFile = "adm_temp.log";

            let fileSize = 0;
            try {
                fileSize = await client.size(remoteFile);
            } catch (e) {
                console.log("❌ Could not get file size:", e.message);
                client.close();
                return;
            }

            const start = Math.max(0, fileSize - 4096);

            await client.downloadTo(tempFile, remoteFile, start);
            client.close();

            const stats = fs.statSync(tempFile);

            if (stats.size > lastSize) {
                const stream = fs.createReadStream(tempFile, {
                    start: lastSize,
                    end: stats.size
                });

                stream.on("data", chunk => {
                    const lines = chunk.toString().split("\n");
                    lines.forEach(processLogLine);
                });

                lastSize = stats.size;
            }

        } catch (err) {
            console.log("❌ FTP error:", err.message);
        }
    }, 5000);
}

function processLogLine(line) {
    if (!line.trim()) return;

    console.log("LOG:", line);

    if (line.includes("killed") && line.includes("zombie")) {
        const match = line.match(/Player\s+"([^"]+)".*killed\s+zombie/i);
        if (match) awardTokens(match[1], 1);
    }

    if (line.includes("placed Fireplace")) {
        const match = line.match(/Player\s+"([^"]+)"/i);
        if (match) awardTokens(match[1], 5);
    }
}

function awardTokens(gamertag, amount) {
    db.query(
        "UPDATE players SET tokens = tokens + ? WHERE xbox_gamertag = ?",
        [amount, gamertag],
        err => {
            if (err) return console.error(err);
            console.log(`⭐ Awarded ${amount} tokens to ${gamertag}`);
        }
    );
}

module.exports = {
    getFile,
    getNewestADM,
    startFTPWatcher
};
