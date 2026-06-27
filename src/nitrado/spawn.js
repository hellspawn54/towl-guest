const axios = require("axios");
const config = require("../config");

module.exports.spawnItem = async (discordId, className) => {
  try {
    const payload = {
      type: "spawn",
      player: discordId,
      item: className,
      location: "fireplace"
    };

    await axios.post(config.nitrado.api, payload);
    console.log(`Spawned ${className} for ${discordId}`);
  } catch (err) {
    console.error("Nitrado spawn error:", err);
  }
};
