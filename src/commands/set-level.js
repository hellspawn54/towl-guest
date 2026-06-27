import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";
import db from "../database.js";

export default {
  data: new SlashCommandBuilder()
    .setName("set-level")
    .setDescription("Admin: Set a player's level")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("The Discord user")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("level")
        .setDescription("New level (survivor, warrior, elite, etc.)")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser("user");
    const newLevel = interaction.options.getString("level").toLowerCase();

    // -------------------------------
    // CHECK IF PLAYER EXISTS
    // -------------------------------
    const [rows] = await db.query(
      "SELECT * FROM players WHERE discord_id = ?",
      [targetUser.id]
    );

    if (!rows.length) {
      return interaction.editReply({
        content: `❌ ${targetUser.username} is not linked to the bot.`
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("⚠ Confirm Level Change")
      .setColor("#ffaa00")
      .setDescription(
        `Are you sure you want to set **${targetUser.username}** to level **${newLevel}**?`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`setlevel:yes:${targetUser.id}:${newLevel}`)
        .setLabel("Confirm")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("setlevel:no")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
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
    if (!interaction.customId.startsWith("setlevel")) return;

    const parts = interaction.customId.split(":");
    const action = parts[1];

    if (action === "no") {
      return interaction.reply({
        content: "❌ Level change cancelled.",
        ephemeral: true
      });
    }

    if (action === "yes") {
      const discordId = parts[2];
      const newLevel = parts[3];

      try {
        await db.query(
          "UPDATE players SET level = ? WHERE discord_id = ?",
          [newLevel, discordId]
        );

        return interaction.reply({
          content: `✅ Level updated to **${newLevel}**.`,
          ephemeral: true
        });
      } catch (err) {
        console.error("❌ Level update error:", err);
        return interaction.reply({
          content: "❌ Failed to update level.",
          ephemeral: true
        });
      }
    }
  }
};