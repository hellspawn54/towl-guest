import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";
import db from "../database.js";

export default {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("View all available shop items"),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Fetch all shop items
    const [items] = await db.query("SELECT * FROM shop_items ORDER BY tier, cost ASC");

    if (!items.length) {
      return interaction.editReply({
        content: "❌ No shop items found in the database."
      });
    }

    // Group items by tier
    const tiers = {};
    for (const item of items) {
      if (!tiers[item.tier]) tiers[item.tier] = [];
      tiers[item.tier].push(item);
    }

    // Build embed
    const embed = new EmbedBuilder()
      .setTitle("🏪 Shop Items")
      .setColor("#00aaff")
      .setDescription("Here are all items available for purchase.")
      .setFooter({ text: "Use /buy <item> to purchase." });

    for (const tier of Object.keys(tiers)) {
      const list = tiers[tier]
        .map(i => `**${i.name}** — ${i.cost} tokens`)
        .join("\n");

      embed.addFields({
        name: `📦 ${tier.toUpperCase()}`,
        value: list || "No items",
        inline: false
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("shop:buy")
        .setLabel("Buy Item")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("shop:profile")
        .setLabel("View Profile")
        .setStyle(ButtonStyle.Success)
    );

    return interaction.editReply({
      embeds: [embed],
      components: [row]
    });
  },

  // BUTTON HANDLER
  async handleButton(interaction) {
    const action = interaction.customId.split(":")[1];

    if (action === "buy") {
      return interaction.reply({
        content: "🛒 Use **/buy <item>** to purchase an item.",
        ephemeral: true
      });
    }

    if (action === "profile") {
      return interaction.reply({
        content: "👤 Use **/profile** to view your stats.",
        ephemeral: true
      });
    }
  }
};