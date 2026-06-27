const db = require("./database.js");

class EventDispatcher {
    constructor(client) {
        this.client = client;
        this.EVENT_CHANNEL = "1517701634732593202";
    }

    sendToChannel(message) {
        const channel = this.client.channels.cache.get(this.EVENT_CHANNEL);
        if (channel) channel.send(message);
    }

    async handleFireplace(event) {
        const { player, x, y, z } = event;

        this.sendToChannel(
            `🔥 **Fireplace placed by ${player}**\nX: ${x} | Y: ${y} | Z: ${z}`
        );
    }

    async handleBuild(event) {
        const { player, object } = event;

        this.sendToChannel(
            `🧱 **${player} built ${object}**`
        );
    }

    async handleDismantle(event) {
        const { player, object } = event;

        this.sendToChannel(
            `🪓 **${player} dismantled ${object}**`
        );
    }

    async handlePlacement(event) {
        const { player, object } = event;

        this.sendToChannel(
            `📦 **${player} placed ${object}**`
        );
    }

    async handleHit(event) {
        const { attacker, victim } = event;

        this.sendToChannel(
            `🔫 **${attacker} hit ${victim}**`
        );
    }

    async handleKill(event) {
        const { killer, victim } = event;

        this.sendToChannel(
            `💀 **${killer} killed ${victim}**`
        );
    }

    async handleConnect(event) {
        const { player } = event;

        this.sendToChannel(
            `🔌 **${player} connected**`
        );
    }

    async handleDisconnect(event) {
        const { player } = event;

        this.sendToChannel(
            `🔌 **${player} disconnected**`
        );
    }

    async handlePosition(event) {
        const { player, x, y, z } = event;
    }

    async dispatch(event) {
        switch (event.type) {
            case "fireplace":
                return this.handleFireplace(event);

            case "build":
                return this.handleBuild(event);

            case "dismantle":
                return this.handleDismantle(event);

            case "placement":
                return this.handlePlacement(event);

            case "hit":
                return this.handleHit(event);

            case "kill":
                return this.handleKill(event);

            case "connect":
                return this.handleConnect(event);

            case "disconnect":
                return this.handleDisconnect(event);

            case "position":
                return this.handlePosition(event);

            default:
                console.log("⚠️ Unknown event type:", event);
        }
    }
}

module.exports = (client) => new EventDispatcher(client);


