setInterval(() => {
    const last = global.lastAdmCheck || 0;
    const now = Date.now();

    // If ADM watcher hasn't updated in 2 minutes, restart bot
    if (now - last > 120000) {
        console.log("⚠ ADM Watchdog: No log updates detected. Restarting bot...");
        const { exec } = require("child_process");
        exec("pm2 restart towlbot");
    }
}, 30000);
