const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const db = require("../database.js");

module.exports = {
    parse(line, client) {
        const events = [];

        if (
            line.includes("PlayerList log") ||
            line.includes("#####") ||
            line.includes("AdminLog started")
        ) {
            return events;
        }

        // -------------------------------
        // CONNECT
        // -------------------------------
        if (line.includes("is connected")) {
            const match = line.match(/Player\s+"([^"]+)".*is connected/);
            if (match) {
                events.push({
                    type: "connect",
                    player: match[1]
                });
            }
        }

        // -------------------------------
        // DISCONNECT
        // -------------------------------
        if (line.includes("has been disconnected")) {
            const match = line.match(/Player\s+"([^"]+)".*disconnected/);
            if (match) {
                events.push({
                    type: "disconnect",
                    player: match[1]
                });
            }
        }

        // -------------------------------
        // FIREPLACE (REAL FORMAT)
        // Example:
        // Player "HELLSPAWN54" (id=XXXX pos=<12654.1, 9388.1, 5.9>) placed Fireplace<Fireplace>
        // -------------------------------
        if (line.includes("placed Fireplace")) {
            const match = line.match(
                /Player\s+"([^"]+)".*pos=<([\d.\-]+),\s*([\d.\-]+),\s*([\d.\-]+)>.*placed Fireplace/i
            );

            if (match) {
                const player = match[1];
                const x = parseFloat(match[2]);
                const y = parseFloat(match[3]);
                const z = parseFloat(match[4]);

                events.push({
                    type: "fireplace",
                    player,
                    x,
                    y,
                    z
                });

                // 🔥 Trigger your DM handler
                handleFireplaceDM(player, x, y, z, client);
            }
        }

        // -------------------------------
        // OTHER PLACEMENTS
        // -------------------------------
        if (line.includes("placed") && !line.includes("Fireplace")) {
            const match = line.match(
                /Player\s+"([^"]+)".*placed\s+([A-Za-z0-9_<>]+)/
            );

            if (match) {
                events.push({
                    type: "placement",
                    player: match[1],
                    object: match[2]
                });
            }
        }

        // -------------------------------
        // BUILDS
        // -------------------------------
        if (line.includes("built")) {
            const match = line.match(/Player\s+"([^"]+)".*built\s+(\S+)/);
            if (match) {
                events.push({
                    type: "build",
                    player: match[1],
                    object: match[2]
                });
            }
        }

        // -------------------------------
        // DISMANTLE
        // -------------------------------
        if (line.includes("dismantled")) {
            const match = line.match(/Player\s+"([^"]+)".*dismantled\s+(\S+)/);
            if (match) {
                events.push({
                    type: "dismantle",
                    player: match[1],
                    object: match[2]
                });
            }
        }

        // -------------------------------
        // EMOTES
        // -------------------------------
        if (line.includes("performed")) {
            const match = line.match(/Player\s+"([^"]+)".*performed\s+(\S+)/);
            if (match) {
                events.push({
                    type: "emote",
                    player: match[1],
                    action: match[2]
                });
            }
        }

        return events;
    }
};

// ---------------------------------------------------------
// 🔥 FIREPLACE DM HANDLER (your working version)
// ---------------------------------------------------------
async function handleFireplaceDM(gamertag, x, y, z, client) {
    try {
        const [rows] = await db.query(
            "SELECT * FROM players WHERE xbox_gamertag = ?",
            [gamertag]
        );

        if (rows.length === 0) {
            console.log(`⚠ Fireplace by unlinked player: ${gamertag}`);
            return;
        }

        const player = rows[0];
        const discordId = player.discord_id;
        const user = await client.users.fetch(discordId).catch(() => null);

        if (!user) {
            console.log(`⚠ Could not DM Discord user for ${gamertag} (${discordId})`);
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle("🔥 Fireplace Detected")
            .setColor("#ffaa00")
            .setDescription(
                "Do you want to save this location as your **shop spawn**?"
            )
            .addFields(
                { name: "Gamertag", value: gamertag, inline: true },
                { name: "X", value: x.toString(), inline: true },
                { name: "Y", value: y.toString(), inline: true },
                { name: "Z", value: z.toString(), inline: true }
            )
            .setFooter({ text: "This will be used for shop item injections." });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`fireplace-shopspawn:yes:${x}:${y}:${z}`)
                .setLabel("Yes, save spawn")
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId("fireplace-shopspawn:no")
                .setLabel("No")
                .setStyle(ButtonStyle.Danger)
        );

        await user.send({ embeds: [embed], components: [row] });
        console.log(`✅ DM sent to ${gamertag} (${discordId}) for shop spawn`);

    } catch (err) {
        console.error("❌ Fireplace handler error:", err);
    }
}

// ---------------------------------------------------------
// 🔘 BUTTON HANDLER
// ---------------------------------------------------------
module.exports.handleButton = async function (interaction) {
    const [prefix, action, x, y, z] = interaction.customId.split(":");

    if (prefix !== "fireplace-shopspawn") return;

    if (action === "no") {
        return interaction.reply({
            content: "❌ Shop spawn not saved.",
            ephemeral: true
        });
    }

    if (action === "yes") {
        const discordId = interaction.user.id;

        try {
            await db.query(
                `INSERT INTO shop_spawns (discord_id, x, y, z)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE x = VALUES(x), y = VALUES(y), z = VALUES(z)`,
                [discordId, parseFloat(x), parseFloat(y), parseFloat(z)]
            );

            return interaction.reply({
                content: "✅ Shop spawn location saved.",
                ephemeral: true
            });
        } catch (err) {
            console.error("❌ Saving shop spawn failed:", err);
            return interaction.reply({
                content: "❌ Failed to save shop spawn.",
                ephemeral: true
            });
        }
    }
};
