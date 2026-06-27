const EventEmitter = require('events');
const { getLatestAdmLog } = require('./nitradoApi/admSource');
const parser = require('./logParser');

class LogWatcher extends EventEmitter {
  constructor(interval = 10000, dispatcher) {
    super();
    this.interval = interval;
    this.dispatcher = dispatcher;
    this.lastLineCount = 0;
  }

  start() {
    console.log('[ADM] LogWatcher started');
    this.timer = setInterval(() => this.poll(), this.interval);
  }

  stop() {
    clearInterval(this.timer);
  }

  async poll() {
    try {
      const { source, content } = await getLatestAdmLog();
      const lines = content.split(/\r?\n/).filter(Boolean);

      if (lines.length > this.lastLineCount) {
        const newLines = lines.slice(this.lastLineCount);
        this.lastLineCount = lines.length;

        console.log(`[ADM] ${newLines.length} new lines (${source})`);

        for (const line of newLines) {
          const events = parser.parse(line);
          for (const event of events) {
            this.dispatcher.dispatch(event);
          }
        }
      }
    } catch (err) {
      console.error('[ADM] Poll error:', err.message);
    }
  }
}

module.exports = LogWatcher;
