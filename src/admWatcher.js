import fs from "fs";
import axios from "axios";
import EventEmitter from "events";
import configJson from "../config.json" with { type: "json" };
import { updateQuestProgress } from "./quests/engine.js";

const { ID1, ID2, NITRATOKEN } = configJson;

const admWatcher = new EventEmitter();

let lastLine = 0;

export function startAdmWatcher(client) {
  console.log("📡 ADM Watcher started...");

  setInterval(async () => {
    try {
      const url = `https://api.nitrado.net/services/${ID1}/gameservers/file_server/download?file=/games/${ID2}/dayzxb/config/adm.log`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${NITRATOKEN}` }
      });

      const lines = response.data.split("\n");

      for (let i = lastLine; i < lines.length; i++) {
        const line = lines[i];
        parseAdmLine(line, client);
      }

      lastLine = lines.length;
    } catch (err) {
      console.error("❌ ADM watcher error:", err.message);
    }
  }, 5000);
}

function parseAdmLine(line, client) {
  if (!line) return;

  // Example: Player killed Infected
  if (line.includes("killed by Infected")) {
    const match = line.match(/Player\s(.+?)\s/);
    if (match) {
      const player = match[1];
      admWatcher.emit("infectedKill", player);
    }
  }

  // Example: Player killed Wolf
  if (line.includes("killed by Wolf")) {
    const match = line.match(/Player\s(.+?)\s/);
    if (match) {
      const player = match[1];
      admWatcher.emit("wolfKill", player);
    }
  }

  // Example: Fireplace placement
  if (line.includes("placed Fireplace")) {
    const match = line.match(/Player\s(.+?)\splaced Fireplace at X:(.+?) Y:(.+?) Z:(.+?)$/);
    if (match) {
      const player = match[1];
      const x = parseFloat(match[2]);
      const y = parseFloat(match[3]);
      const z = parseFloat(match[4]);

      client.emit("shopSpawnDetected", { player, x, y, z });
    }
  }
}

// Quest event listeners
admWatcher.on("infectedKill", async (gamertag) => {
  await updateQuestProgressByGamertag(gamertag, "kill50infected", 1, client);
});



admWatcher.on("wolfKill", async (gamertag) => {
  await updateQuestProgressByGamertag(gamertag, "kill10wolves", 1, client);
});

async function updateQuestProgressByGamertag(gamertag, questCode, amount, client) {

  const [rows] = await db.query(
    "SELECT discord_id FROM players WHERE xbox_gamertag = ?",
    [gamertag]
  );

  if (!rows.length) return;

  const discordId = rows[0].discord_id;

  const result = await updateQuestProgress(discordId, questCode, amount, client);


  if (result?.completed) {
    console.log(`🏆 Quest completed: ${questCode} by ${gamertag}`);
  }
}

