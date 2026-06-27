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
    .setName("shopspawn")
    .setDescription("Manually set your shop spawn location")
    .addNumberOption(option =>
      option
        .setName("x")
        .setDescription("X coordinate")
        .setRequired(true)
    )
    .addNumberOption(option =>
      option
        .setName("y")
        .setDescription("Y coordinate")
        .setRequired(true)
    )
    .addNumberOption(option =>
      option
        .setName("z")
        .setDescription("Z coordinate")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const discordId = interaction.user.id;
    const x = interaction.options.getNumber("x");
    const y = interaction.options.getNumber("y");
    const z = interaction.options.getNumber("z");

    // Check if linked
    const [rows] = await db.query(
      "SELECT * FROM players WHERE discord_id = ?",
      [discordId]
    );

    if (!rows.length) {
      return interaction.editReply({
        content: "❌ You must link your account first using **/link**"
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("📍 Confirm Shop Spawn")
      .setColor("#ffaa00")
      .setDescription("Do you want to save this location as your shop spawn?")
      .addFields(
        { name: "X", value: x.toString(), inline: true },
        { name: "Y", value: y.toString(), inline: true },
        { name: "Z", value: z.toString(), inline: true }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`shopspawn:yes:${x}:${y}:${z}`)
        .setLabel("Save Spawn")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("shopspawn:no")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
    );

    return interaction.editReply({
      embeds: [embed],
      components: [row]
    });
  },

  // BUTTON HANDLER
  async handleButton(interaction) {
    if (!interaction.customId.startsWith("shopspawn")) return;

    const parts = interaction.customId.split(":");
    const action = parts[1];

    if (action === "no") {
      return interaction.reply({
        content: "❌ Shop spawn not saved.",
        ephemeral: true
      });
    }

    if (action === "yes") {
      const x = parseFloat(parts[2]);
      const y = parseFloat(parts[3]);
      const z = parseFloat(parts[4]);
      const discordId = interaction.user.id;

      try {
        await db.query(
          `INSERT INTO shop_spawns (discord_id, x, y, z)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE x = VALUES(x), y = VALUES(y), z = VALUES(z)`,
          [discordId, x, y, z]
        );

        return interaction.reply({
          content: "✅ Shop spawn location saved.",
          ephemeral: true
        });
      } catch (err) {
        console.error("❌ Shopspawn save error:", err);
        return interaction.reply({
          content: "❌ Failed to save shop spawn.",
          ephemeral: true
        });
      }
    }
  }
};