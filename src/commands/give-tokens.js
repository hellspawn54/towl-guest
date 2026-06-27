const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const db = require("../database.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("give-tokens")
    .setDescription("Admin: Give tokens to a linked player")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
      option
        .setName("player")
        .setDescription("The Discord user to give tokens to")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription("Amount of tokens to give")
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser("player");
    const amount = interaction.options.getInteger("amount");

    try {
      // Check if target is linked
      const [rows] = await db.query(
        "SELECT * FROM players WHERE discord_id = ?",
        [target.id]
      );

      if (rows.length === 0) {
        return interaction.editReply({
          content: `❌ <@${target.id}> is **not linked**. They must run **/link** first.`
        });
      }

      // Update tokens
      await db.query(
        "UPDATE players SET tokens = tokens + ? WHERE discord_id = ?",
        [amount, target.id]
      );

      const newBalance = rows[0].tokens + amount;

      const embed = new EmbedBuilder()
        .setTitle("💰 Tokens Granted")
        .setColor("#ffaa00")
        .addFields(
          { name: "Player", value: `<@${target.id}>`, inline: true },
          { name: "Amount Given", value: `${amount}`, inline: true },
          { name: "New Balance", value: `${newBalance}`, inline: true }
        )
        .setFooter({ text: "Token adjustment successful." });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("give-tokens:again")
          .setLabel("Give More Tokens")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("give-tokens:profile")
          .setLabel("View Player Profile")
          .setStyle(ButtonStyle.Success)
      );

      return interaction.editReply({
        embeds: [embed],
        components: [row]
      });

    } catch (err) {
      console.error("❌ /give-tokens error:", err);
      return interaction.editReply({
        content: "❌ Failed to give tokens. Check console for details."
      });
    }
  },

  // ⭐ BUTTON HANDLER (self-contained)
  async handleButton(interaction) {
    const action = interaction.customId.split(":")[1];

    if (action === "again") {
      return interaction.reply({
        content: "💰 Use **/give-tokens** to grant more tokens.",
        ephemeral: true
      });
    }

    if (action === "profile") {
      return interaction.reply({
        content: "👤 Use **/profile** to view player stats.",
        ephemeral: true
      });
    }
  }
};