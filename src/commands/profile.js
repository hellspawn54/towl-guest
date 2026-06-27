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
    .setName("profile")
    .setDescription("View your player profile"),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const discordId = interaction.user.id;

    // -------------------------------
    // CHECK IF LINKED
    // -------------------------------
    const [playerRows] = await db.query(
      "SELECT * FROM players WHERE discord_id = ?",
      [discordId]
    );

    if (!playerRows.length) {
      return interaction.editReply({
        content: "❌ You must link your account first using **/link**"
      });
    }

    const player = playerRows[0];

    // -------------------------------
    // GET SHOP SPAWN
    // -------------------------------
    const [spawnRows] = await db.query(
      "SELECT * FROM shop_spawns WHERE discord_id = ?",
      [discordId]
    );

    let spawnText = "❌ No spawn saved";
    if (spawnRows.length) {
      const s = spawnRows[0];
      spawnText = `X: **${s.x}**, Y: **${s.y}**, Z: **${s.z}**`;
    }

    // -------------------------------
    // GET PENDING SHOP ITEMS
    // -------------------------------
    const [pending] = await db.query(
      "SELECT item_name, quantity FROM pending_shop_items WHERE discord_id = ?",
      [discordId]
    );

    let pendingText = "None";
    if (pending.length) {
      pendingText = pending
        .map(i => `• **${i.item_name}** × ${i.quantity}`)
        .join("\n");
    }

    // -------------------------------
    // BUILD EMBED
    // -------------------------------
    const embed = new EmbedBuilder()
      .setTitle("👤 Your Profile")
      .setColor("#00aaff")
      .addFields(
        { name: "Gamertag", value: player.xbox_gamertag || "❌ Not set", inline: true },
        { name: "Level", value: player.level, inline: true },
        { name: "Tokens", value: player.tokens.toString(), inline: true },
        { name: "Shop Spawn", value: spawnText, inline: false },
        { name: "Pending Shop Items", value: pendingText, inline: false }
      )
      .setFooter({ text: "Use /shop to browse items." });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("profile:shop")
        .setLabel("Open Shop")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("profile:buy")
        .setLabel("Buy Item")
        .setStyle(ButtonStyle.Success)
    );

    return interaction.editReply({
      embeds: [embed],
      components: [row]
    });
  },

  // -------------------------------
  // BUTTON HANDLER
  // -------------------------------
  async handleButton(interaction) {
    const action = interaction.customId.split(":")[1];

    if (action === "shop") {
      return interaction.reply({
        content: "🏪 Use **/shop** to view all shop items.",
        ephemeral: true
      });
    }

    if (action === "buy") {
      return interaction.reply({
        content: "🛒 Use **/buy <item>** to purchase an item.",
        ephemeral: true
      });
    }
  }
};