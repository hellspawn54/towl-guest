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
    .setName("buy")
    .setDescription("Buy an item from the shop")
    .addStringOption(option =>
      option
        .setName("item")
        .setDescription("The name of the item you want to buy")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("quantity")
        .setDescription("How many you want to buy")
        .setRequired(false)
        .setMinValue(1)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const discordId = interaction.user.id;
    const itemName = interaction.options.getString("item");
    const quantity = interaction.options.getInteger("quantity") || 1;

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
    // CHECK IF SHOP SPAWN EXISTS
    // -------------------------------
    const [spawnRows] = await db.query(
      "SELECT * FROM shop_spawns WHERE discord_id = ?",
      [discordId]
    );

    if (!spawnRows.length) {
      return interaction.editReply({
        content:
          "❌ You do not have a shop spawn saved.\nPlace a fireplace in-game or use **/shopspawn**."
      });
    }

    // -------------------------------
    // FETCH ITEM FROM DB
    // -------------------------------
    const [itemRows] = await db.query(
      "SELECT * FROM shop_items WHERE LOWER(name) = LOWER(?)",
      [itemName]
    );

    if (!itemRows.length) {
      return interaction.editReply({
        content: `❌ Item **${itemName}** not found in the shop.`
      });
    }

    const item = itemRows[0];
    const totalCost = item.cost * quantity;

    // -------------------------------
    // CHECK TOKEN BALANCE
    // -------------------------------
    if (player.tokens < totalCost) {
      return interaction.editReply({
        content: `❌ Not enough tokens.\nItem cost: **${item.cost}**\nQuantity: **${quantity}**\nTotal: **${totalCost}**\nYour balance: **${player.tokens}**`
      });
    }

    // -------------------------------
    // DEDUCT TOKENS
    // -------------------------------
    await db.query(
      "UPDATE players SET tokens = tokens - ? WHERE discord_id = ?",
      [totalCost, discordId]
    );

    // -------------------------------
    // ADD TO PENDING SHOP INJECTION
    // -------------------------------
    await db.query(
      `INSERT INTO pending_shop_items (discord_id, item_name, quantity)
       VALUES (?, ?, ?)`,
      [discordId, item.name, quantity]
    );

    const newBalance = player.tokens - totalCost;

    // -------------------------------
    // EMBED RESPONSE
    // -------------------------------
    const embed = new EmbedBuilder()
      .setTitle("🛒 Purchase Successful")
      .setColor("#00ff99")
      .setDescription("Your item has been added to the next shop injection.")
      .addFields(
        { name: "Item", value: item.name, inline: true },
        { name: "Quantity", value: quantity.toString(), inline: true },
        { name: "Cost", value: `${totalCost} tokens`, inline: true },
        { name: "Remaining Balance", value: `${newBalance}`, inline: true }
      )
      .setFooter({
        text: "Items will be injected automatically every 3 hours or via /inject-now"
      });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("buy:again")
        .setLabel("Buy Again")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("buy:shop")
        .setLabel("Open Shop")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("buy:profile")
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

    if (action === "again") {
      return interaction.reply({
        content: "🛒 Use **/buy** to purchase another item.",
        ephemeral: true
      });
    }

    if (action === "shop") {
      return interaction.reply({
        content: "🏪 Use **/shop** to view all shop items.",
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