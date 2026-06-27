const items = require("../../shop/items");
const db = require("../../database");
const nitrado = require("../../nitrado/spawn");

module.exports = {
  name: "shop-buy",
  description: "Buy an item from the shop",
  options: [
    {
      name: "item",
      type: 3,
      description: "Item name",
      required: true
    }
  ],

  run: async (client, interaction) => {
    const discordId = interaction.user.id;
    const itemName = interaction.options.getString("item");

    // Find item
    const item = items.find(
      i => i.name.toLowerCase() === itemName.toLowerCase()
    );

    if (!item)
      return interaction.reply("❌ Item not found.");

    // Get player data
    const [rows] = await db.query(
      "SELECT level, tokens FROM players WHERE discord_id = ?",
      [discordId]
    );

    if (!rows.length)
      return interaction.reply("❌ You are not registered as a player.");

    const player = rows[0];

    // Level check
    if (player.level < item.level_required)
      return interaction.reply("❌ You are not high enough level.");

    // Token check
    if (player.tokens < item.price)
      return interaction.reply("❌ Not enough tokens.");

    // Deduct tokens
    await db.query(
      "UPDATE players SET tokens = tokens - ? WHERE discord_id = ?",
      [item.price, discordId]
    );

    // Spawn item on Nitrado
    await nitrado.spawnItem(discordId, item.class);

    // Log purchase
    await db.query(
      "INSERT INTO purchase_log (discord_id, item, price) VALUES (?, ?, ?)",
      [discordId, item.name, item.price]
    );

    interaction.reply(
      `✅ You bought **${item.name}** for ${item.price} tokens.`
    );
  }
};
