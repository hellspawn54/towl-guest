const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const { injectShopItems } = require("../nitrado/shopInject");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("inject-now")
    .setDescription("Admin: Force inject pending shop items into TOWL-shop.json")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const result = await injectShopItems();

    const embed = new EmbedBuilder()
      .setTitle("📤 Manual Injection Result")
      .setColor(result.success ? "#00ff99" : "#ff4444")
      .setDescription(result.message)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("inject-now:again")
        .setLabel("Run Again")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("inject-now:view")
        .setLabel("View Pending Items")
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.editReply({
      embeds: [embed],
      components: [row]
    });
  },

  // ⭐ BUTTON HANDLER (self-contained)
  async handleButton(interaction) {
    const action = interaction.customId.split(":")[1];

    if (action === "again") {
      return interaction.reply({
        content: "📤 Use **/inject-now** to run another manual injection.",
        ephemeral: true
      });
    }

    if (action === "view") {
      return interaction.reply({
        content: "📦 Use **/shop** to view items players can buy.",
        ephemeral: true
      });
    }
  }
};