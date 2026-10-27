// Einfache In-Memory-Queue: begrenzt gleichzeitige Pipelines (Web und API teilen sich das Limit)

const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_RENDERS || "2");
const queue = [];
let running = 0;

function enqueue(task) {
  queue.push(task);
  drain();
}

function drain() {
  while (running < MAX_CONCURRENT && queue.length > 0) {
    const task = queue.shift();
    running++;
    Promise.resolve()
      .then(task)
      .catch((err) => console.error("[queue] Task fehlgeschlagen:", err.message))
      .finally(() => {
        running--;
        drain();
      });
  }
}

// true, wenn ein neuer Task nicht sofort starten kann
function isBusy() {
  return running >= MAX_CONCURRENT;
}

module.exports = { enqueue, isBusy };
