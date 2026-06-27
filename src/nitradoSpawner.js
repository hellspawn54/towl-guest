const ftp = require("basic-ftp");
const fs = require("fs");
const path = require("path");

// Path to the JSON file you want to inject
const LOCAL_JSON_FILE = path.join(__dirname, "inject.json");

// Path on the Nitrado server where the JSON should be uploaded
const REMOTE_JSON_PATH = "/games/yourprofile/inject.json"; 
// Change this to whatever file you want to overwrite

async function runSpawnInjector() {
    console.log("🚀 Starting JSON injector...");

    // Check if local JSON exists
    if (!fs.existsSync(LOCAL_JSON_FILE)) {
        console.error("❌ inject.json not found in src folder");
        return;
    }

    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASS,
            secure: false
        });

        console.log("✅ Connected to Nitrado FTP");

        console.log("📤 Uploading JSON file...");
        await client.uploadFrom(LOCAL_JSON_FILE, REMOTE_JSON_PATH);

        console.log("🎉 JSON successfully injected into server!");
        console.log(`📁 Uploaded → ${REMOTE_JSON_PATH}`);

    } catch (err) {
        console.error("❌ JSON injection failed:", err.message);
    } finally {
        client.close();
    }
}

module.exports = { runSpawnInjector };
