import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} from "discord.js";
import axios from "axios";
import db from "../database.js";
import configJson from "../../config.json" with { type: "json" };

const { ID1, NITRATOKEN } = configJson;

export default {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Admin: Check bot, DB, and Nitrado status")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const start = Date.now();
    await interaction.deferReply({ ephemeral: true });

    // -------------------------------
    // BOT LATENCY
    // -------------------------------
    const botLatency = Date.now() - start;

    // -------------------------------
    // DATABASE CHECK
    // -------------------------------
    let dbStatus = "🟢 Connected";
    try {
      await db.query("SELECT 1");
    } catch (err) {
      dbStatus = "🔴 Error";
    }

    // -------------------------------
    // NITRADO API CHECK
    // -------------------------------
    let nitradoStatus = "🟢 Online";
    try {
      await axios.get(
        `https://api.nitrado.net/services/${ID1}`,
        { headers: { Authorization: `Bearer ${NITRATOKEN}` } }
      );
    } catch (err) {
      nitradoStatus = "🔴 Offline / Error";
    }

    // -------------------------------
    // EMBED
    // -------------------------------
    const embed = new EmbedBuilder()
      .setTitle("🏓 Ping Status")
      .setColor("#00aaff")
      .addFields(
        { name: "Bot Latency", value: `${botLatency}ms`, inline: true },
        { name: "Database", value: dbStatus, inline: true },
        { name: "Nitrado API", value: nitradoStatus, inline: true }
      )
      .setFooter({ text: "System health check complete." });

    return interaction.editReply({ embeds: [embed] });
  }
};