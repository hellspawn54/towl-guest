import db from "../database.js";
import { LEVELS, LEVEL_XP } from "./levels.js";

export async function addXP(discordId, amount, client) {
  const [rows] = await db.query(
    "SELECT * FROM players WHERE discord_id = ?",
    [discordId]
  );

  if (!rows.length) return;

  const player = rows[0];
  const newXP = player.xp + amount;

  // Update XP
  await db.query(
    "UPDATE players SET xp = ? WHERE discord_id = ?",
    [newXP, discordId]
  );

  // Check for level up
  const currentIndex = LEVELS.indexOf(player.level);

  for (let i = currentIndex + 1; i < LEVELS.length; i++) {
    const nextLevel = LEVELS[i];
    const requiredXP = LEVEL_XP[nextLevel];

    if (newXP >= requiredXP) {
      await levelUp(discordId, nextLevel, client);
    }
  }
}

export async function levelUp(discordId, newLevel, client) {
  // Update level
  await db.query(
    "UPDATE players SET level = ? WHERE discord_id = ?",
    [newLevel, discordId]
  );

  // ⭐ TOKEN REWARD SYSTEM ⭐
  const tokenRewards = {
    1: 10,
    2: 15,
    3: 20,
    4: 25,
    5: 40,
    6: 50,
    7: 60,
    8: 75,
    9: 90,
    10: 120
  };

  const reward = tokenRewards[newLevel] || 0;

  if (reward > 0) {
    await db.query(
      "UPDATE players SET tokens = tokens + ? WHERE discord_id = ?",
      [reward, discordId]
    );
  }

  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) return;

  const member = await guild.members.fetch(discordId).catch(() => null);
  if (!member) return;

  // Remove old level roles
  for (const lvl of LEVELS) {
    const role = guild.roles.cache.find(r => r.name.toLowerCase() === lvl);
    if (role) await member.roles.remove(role).catch(() => {});
  }

  // Add new level role
  const newRole = guild.roles.cache.find(r => r.name.toLowerCase() === newLevel);
  if (newRole) await member.roles.add(newRole).catch(() => {});

  // DM the player
  const user = await client.users.fetch(discordId).catch(() => null);
  if (user) {
    user.send(`🎉 **Level Up!**  
You are now **${newLevel.toUpperCase()}** and earned **${reward} tokens**!`).catch(() => {});
  }

  console.log(`⬆️ ${discordId} leveled up to ${newLevel} (+${reward} tokens)`);
}
