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
    .setName("quest-list")
    .setDescription("View all available quests"),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // -------------------------------
    // GET ALL QUESTS
    // -------------------------------
    const [quests] = await db.query(
      "SELECT * FROM quests ORDER BY required_level, name ASC"
    );

    if (!quests.length) {
      return interaction.editReply({
        content: "❌ No quests found in the database."
      });
    }

    // -------------------------------
    // BUILD EMBED
    // -------------------------------
    const embed = new EmbedBuilder()
      .setTitle("📜 All Quests")
      .setColor("#ffaa00")
      .setDescription("Here are all quests available on the server.")
      .setFooter({ text: "Use /quest to view your personal progress." });

    for (const q of quests) {
      embed.addFields({
        name: `📝 ${q.name}`,
        value:
          `**Required Level:** ${q.required_level}\n` +
          `**Reward:** ${q.reward_tokens} tokens` +
          (q.reward_role ? ` + Role: ${q.reward_role}` : "") +
          `\n\n${q.description}`,
        inline: false
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("questlist:myquests")
        .setLabel("My Quests")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("questlist:profile")
        .setLabel("View Profile")
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

    if (action === "myquests") {
      return interaction.reply({
        content: "📜 Use **/quest** to view your active quests.",
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