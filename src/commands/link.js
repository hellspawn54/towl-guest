const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../database.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("link")
    .setDescription("Link your Discord account to the DayZ bot")
    .addStringOption(option =>
      option
        .setName("gamertag")
        .setDescription("Your Xbox gamertag")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const discordId = interaction.user.id;
    const gamertag = interaction.options.getString("gamertag");

    try {
      // Check if already linked
      const [rows] = await db.query(
        "SELECT * FROM players WHERE discord_id = ?",
        [discordId]
      );

      if (rows.length > 0) {
        return interaction.editReply({
          content: `❌ You are already linked as **${rows[0].xbox_gamertag || "Unknown"}**`
        });
      }

      // Create new player row
      await db.query(
        `INSERT INTO players (discord_id, xbox_gamertag, level, tokens)
         VALUES (?, ?, 'survivor', 0)`,
        [discordId, gamertag]
      );

      const embed = new EmbedBuilder()
        .setTitle("🔗 Account Linked")
        .setColor("#00ff99")
        .setDescription("Your Discord account is now linked to the DayZ bot.")
        .addFields(
          { name: "Discord", value: `<@${discordId}>`, inline: true },
          { name: "Gamertag", value: gamertag, inline: true },
          { name: "Level", value: "survivor", inline: true },
          { name: "Tokens", value: "0", inline: true }
        )
        .setFooter({ text: "You can now use all bot features." });

      return interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error("❌ Link command error:", err);
      return interaction.editReply({
        content: "❌ Failed to link your account. Please try again later."
      });
    }
  }
};