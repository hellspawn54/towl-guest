const db = require("../../database");
const items = require("../../shop/items");

module.exports = {
  name: "shop-list",
  description: "Shows items you can buy",

  run: async (client, interaction) => {
    const discordId = interaction.user.id;

    const [rows] = await db.query(
      "SELECT level, tokens FROM players WHERE discord_id = ?",
      [discordId]
    );

    if (!rows.length)
      return interaction.reply("❌ You are not registered as a player.");

    const player = rows[0];

    // Filter items by level
    const available = items.filter(
      item => item.level_required <= player.level
    );

    if (!available.length)
      return interaction.reply("❌ No items available at your level.");

    const formatted = available
      .map(
        item =>
          `**${item.name}** — ${item.price} tokens (Lvl ${item.level_required})`
      )
      .join("\n");

    interaction.reply({
      content: `🛒 **Available Shop Items**\n\n${formatted}`,
      ephemeral: true
    });
  }
};
