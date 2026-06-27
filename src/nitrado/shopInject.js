const fs = require("fs");
const path = require("path");
const db = require("../database");
const ftpReader = require("../ftpReader");
const chalk = require("chalk");

/**
 * Converts DB shop items into the JSON structure used by TOWL-shop.json
 */
async function buildShopJson() {
  const [rows] = await db.query("SELECT * FROM shop_items");

  const items = rows.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description || "",
    tier: item.tier,
    cost: item.cost
  }));

  return { items };
}

/**
 * Uploads JSON to Nitrado server using your existing FTP module
 */
async function uploadToNitrado(jsonData) {
  const jsonString = JSON.stringify(jsonData, null, 2);

  const localPath = path.join(__dirname, "../../TOWL-shop.json");
  fs.writeFileSync(localPath, jsonString);

  try {
    await ftpReader.uploadFile(
      localPath,
      "/dayzxb_missions/dayzOffline.chernarusplus/TOWL-shop.json"
    );

    return { success: true, message: "Shop injected successfully." };
  } catch (err) {
    return { success: false, message: "FTP upload failed: " + err.message };
  }
}

/**
 * Main function called by /inject-now
 */
async function injectShopItems() {
  try {
    console.log(chalk.cyan("📦 Building shop JSON from database..."));
    const jsonData = await buildShopJson();

    console.log(chalk.cyan("📤 Uploading to Nitrado..."));
    const result = await uploadToNitrado(jsonData);

    return result;
  } catch (err) {
    console.error(err);
    return { success: false, message: "Injection failed: " + err.message };
  }
}

module.exports = { injectShopItems };
