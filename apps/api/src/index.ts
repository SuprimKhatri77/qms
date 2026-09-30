import { createApp } from "./app";
import {
  EXPIRY_SWEEP_INTERVAL_MS,
  runExpirySweep,
} from "./services/queue/expire-finished-queues.service";

// How many proxies sit in front of the API (see AppOptions in app.ts).
// 0, the default, trusts none. In production, set it to the number of
// proxies, e.g. 1 behind a single load balancer.
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
  throw new Error("TRUST_PROXY_HOPS must be a whole number, 0 or more");
}

const app = createApp({ trustProxyHops });

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Closes queues whose hours are up or whose day has ended, and expires the
// tickets left in them. Once now, to catch up after downtime, then on a timer.
void runExpirySweep();
setInterval(() => void runExpirySweep(), EXPIRY_SWEEP_INTERVAL_MS);
