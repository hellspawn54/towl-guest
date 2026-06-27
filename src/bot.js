const dotenv = require("dotenv");
dotenv.config();
const LogWatcher = require("./logWatcher.js");
const fs = require("fs");
const path = require("path");
const { Client, GatewayIntentBits, REST, Routes, Collection, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
//const db =require("./database.js");

const BOT_TOKEN = process.env.BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const DEV_MODE = process.env.DEV_MODE === "true";

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN missing in .env");
  process.exit(1);
}

if (DEV_MODE && !GUILD_ID) {
  console.error("❌ GUILD_ID required when DEV_MODE=true");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: ["CHANNEL"]
});

client.commands = new Collection();
const cooldowns = new Collection();

// load commands
const commandsPath = path.join(__dirname, "commands");
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);

    if (!command?.data || !command?.execute) {
      console.warn(`⚠️ Command ${file} missing data/execute`);
      continue;
    }

    client.commands.set(command.data.name, command);
  }
}

client.on("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const watcher = new LogWatcher(10000);
  const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);
  const commandsJson = [...client.commands.values()].map(c => c.data.toJSON());

  try {
    if (DEV_MODE) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, GUILD_ID),
        { body: commandsJson }
      );
      console.log("⚡ Dev: guild commands registered");
    } else {
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commandsJson }
      );
      console.log("🌍 Global commands registered");
    }
  } catch (err) {
    console.error("❌ Command registration failed:", err);
  }
});

client.on("interactionCreate", async interaction => {
  if (interaction.isButton()) {
    const id = interaction.customId;

    if (id.startsWith("shopspawn_save_")) {
      const discordId = id.replace("shopspawn_save_", "");
      const coords = client.lastFireplace?.[discordId];

      if (!coords) {
        return interaction.reply({
          content: "❌ No fireplace location stored. Try placing another fireplace.",
          ephemeral: true
        });
      }

      const { x, y, z } = coords;

      try {
        await db.query(
          `INSERT INTO shop_spawns (discord_id, x, y, z)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE x=?, y=?, z=?, last_updated=CURRENT_TIMESTAMP`,
          [discordId, x, y, z, x, y, z]
        );

        return interaction.reply({
          content: `✅ **Shop spawn point saved!**\nX: ${x}\nY: ${y}\nZ: ${z}`,
          ephemeral: true
        });

      } catch (err) {
        console.error("❌ DB error saving shop spawn:", err);
        return interaction.reply({
          content: "❌ Failed to save shop spawn point.",
          ephemeral: true
        });
      }
    }

    if (id.startsWith("shopspawn_ignore_")) {
      return interaction.reply({
        content: "❌ Spawn point ignored.",
        ephemeral: true
      });
    }

    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  const now = Date.now();
  const cooldownAmount = (command.cooldown || 0) * 1000;

  if (cooldownAmount > 0) {
    if (!cooldowns.has(command.data.name)) {
      cooldowns.set(command.data.name, new Collection());
    }

    const timestamps = cooldowns.get(command.data.name);
    const expirationTime = timestamps.get(interaction.user.id) || 0;

    if (now < expirationTime) {
      const remaining = ((expirationTime - now) / 1000).toFixed(1);
      return interaction.reply({
        content: `⏳ Cooldown: **${remaining}s**`,
        ephemeral: true
      });
    }

    timestamps.set(interaction.user.id, now + cooldownAmount);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
  }

  try {
    //await command.execute(interaction, { db });
  } catch (err) {
    console.error(`❌ Error in /${interaction.commandName}:`, err);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({
        content: "❌ Error executing command.",
        ephemeral: true
      }).catch(() => {});
    } else {
      await interaction.reply({
        content: "❌ Error executing command.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});
const EventDispatcher = require("./eventDispatcher")(client);
const watcher = new LogWatcher(10000, EventDispatcher);

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  watcher.start();
});


client.login(BOT_TOKEN).catch(err => {
  console.error("❌ Failed to login:", err);
  process.exit(1);
});
