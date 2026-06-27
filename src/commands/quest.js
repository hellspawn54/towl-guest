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
    .setName("quest")
    .setDescription("View your active quests"),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const discordId = interaction.user.id;

    // -------------------------------
    // CHECK IF LINKED
    // -------------------------------
    const [playerRows] = await db.query(
      "SELECT id, xbox_gamertag FROM players WHERE discord_id = ?",
      [discordId]
    );

    if (!playerRows.length) {
      return interaction.editReply({
        content: "❌ You must link your account first using **/link**"
      });
    }

    const playerId = playerRows[0].id;

    // -------------------------------
    // GET QUEST PROGRESS
    // -------------------------------
    const [quests] = await db.query(
      `SELECT 
        q.name,
        q.description,
        q.reward_tokens,
        q.reward_role,
        qp.status,
        qp.progress,
        qp.target
       FROM quest_progress qp
       JOIN quests q ON q.id = qp.quest_id
       WHERE qp.player_id = ?`,
      [playerId]
    );

    if (!quests.length) {
      return interaction.editReply({
        content: "📭 You have no quests assigned."
      });
    }

    // -------------------------------
    // BUILD EMBED
    // -------------------------------
    const embed = new EmbedBuilder()
      .setTitle("📜 Your Quests")
      .setColor("#ffaa00")
      .setFooter({ text: "Keep surviving out there." });

    for (const q of quests) {
      const statusEmoji =
        q.status === "completed"
          ? "🏆"
          : q.status === "in_progress"
          ? "⏳"
          : "📝";

      embed.addFields({
        name: `${statusEmoji} ${q.name}`,
        value:
          `**Status:** ${q.status}\n` +
          `**Progress:** ${q.progress}/${q.target}\n` +
          `**Reward:** ${q.reward_tokens} tokens` +
          (q.reward_role ? ` + Role: ${q.reward_role}` : "") +
          `\n\n${q.description}`,
        inline: false
      });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("quest:list")
        .setLabel("View All Quests")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("quest:profile")
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

    if (action === "list") {
      return interaction.reply({
        content: "📜 Use **/quest-list** to view all quests.",
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