const axios = require("axios");

const API_BASE = "https://api.nitrado.net";

function parseAdmTimestamp(filename) {
    const match = filename.match(/(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})/);
    if (!match) return null;

    const [_, datePart, timePart] = match;
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute, second] = timePart.split("-").map(Number);

    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

async function nitradoRequest(path) {
    const token = process.env.NITRADO_API_TOKEN;
    if (!token) throw new Error("NITRADO_API_TOKEN missing");

    const url = `${API_BASE}${path}`;

    const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (res.data.status !== "success") {
        throw new Error(`Nitrado API error: ${JSON.stringify(res.data)}`);
    }

    return res.data;
}

async function getGameserver(serviceId) {
    const json = await nitradoRequest(`/services/${serviceId}/gameservers`);
    return json.data.gameserver;
}

async function listAdmFiles(serviceId) {
    const gs = await getGameserver(serviceId);

    const basePath = gs.game_specific.path;
    const logFiles = gs.game_specific.log_files;

    const admFiles = logFiles
        .filter(f => f.endsWith(".ADM"))
        .map(rel => {
            const name = rel.split("/").pop();
            const timestamp = parseAdmTimestamp(name);
            return {
                name,
                rel,
                fullPath: `${basePath}${rel.replace(/^dayzxb\//, "")}`,
                timestamp
            };
        })
        .filter(f => f.timestamp)
        .sort((a, b) => a.timestamp - b.timestamp);

    return admFiles;
}

async function downloadAdmFile(serviceId, filePath) {
    const encoded = encodeURIComponent(filePath);

    const json = await nitradoRequest(
        `/services/${serviceId}/gameservers/file_server/download?file=${encoded}`
    );

    const url = json.data.token.url;
    const res = await axios.get(url);
    return res.data;
}

module.exports = {
    listAdmFiles,
    downloadAdmFile
};
