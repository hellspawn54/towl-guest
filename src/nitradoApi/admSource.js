const { listAdmFiles, downloadAdmFile } = require("./nitrado");
const ftp = require("basic-ftp");
const fs = require("fs");

async function getLatestAdmLog() {
    const serviceId = process.env.NITRADO_SERVICE_ID;

    try {
        const files = await listAdmFiles(serviceId);
        if (!files.length) throw new Error("No ADM files found");

        const newest = files[files.length - 1];

        const content = await downloadAdmFile(serviceId, newest.fullPath);

        return { source: "api", content };
    } catch (err) {
        console.warn("[ADM] API failed, falling back to FTP:", err.message);
    }

    try {
        const client = new ftp.Client();
        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASS,
            secure: false
        });

        const tempFile = "./adm_temp.log";

        await client.downloadTo(tempFile, process.env.ADM_LOG_PATH);

        const content = fs.readFileSync(tempFile, "utf8");
        fs.unlinkSync(tempFile);

        client.close();

        return { source: "ftp", content };
    } catch (err) {
        console.error("[ADM] FTP also failed:", err.message);
        throw new Error("ADM log unavailable");
    }
}

module.exports = { getLatestAdmLog };
