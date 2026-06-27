const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const chalk = require("chalk");

dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

async function init() {
  try {
    await db.getConnection();
    console.log("✅ Connected to MySQL");

    await db.query(`
      CREATE TABLE IF NOT EXISTS players (
        id INT AUTO_INCREMENT PRIMARY KEY,
        discord_id VARCHAR(50) NOT NULL UNIQUE,
        xbox_gamertag VARCHAR(50),
        level VARCHAR(20) DEFAULT 'survivor',
        tokens INT DEFAULT 0
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS quests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        required_level VARCHAR(20) DEFAULT 'survivor',
        reward_tokens INT DEFAULT 0,
        reward_role VARCHAR(50) NULL
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS quest_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        player_id INT NOT NULL,
        quest_id INT NOT NULL,
        status ENUM('not_started','in_progress','completed') DEFAULT 'not_started',
        progress INT DEFAULT 0,
        target INT DEFAULT 1,
        UNIQUE KEY unique_player_quest (player_id, quest_id),
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
        FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS shop_spawns (
        discord_id VARCHAR(50) PRIMARY KEY,
        x FLOAT NOT NULL,
        y FLOAT NOT NULL,
        z FLOAT NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS shop_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        tier VARCHAR(20) NOT NULL,
        cost INT NOT NULL DEFAULT 0
      );
    `);

    console.log("✅ Tables ready");
  } catch (err) {
    //console.log("❌ DB init failed");
    console.error(err);
  }
}

init();

//module.exports = db;
