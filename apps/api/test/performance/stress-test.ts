import autocannon from 'autocannon';

interface StressLevel {
  connections: number;
  requestsPerSec: number;
  latencyAvg: number;
  latencyP99: number;
  errors: number;
}

async function stressTest(baseUrl: string, token: string) {
  const levels = [10, 25, 50, 100, 200];
  const results: StressLevel[] = [];

  console.log('='.repeat(60));
  console.log('IMS API Stress Test');
  console.log('='.repeat(60));
  console.log(`Target: ${baseUrl}/api/items`);
  console.log(`Gradually increasing from ${levels[0]} to ${levels[levels.length - 1]} connections`);
  console.log('');

  for (const connections of levels) {
    console.log(`\nTesting with ${connections} concurrent connections...`);

    const result = await autocannon({
      url: `${baseUrl}/api/items`,
      duration: 15,
      connections,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    const level: StressLevel = {
      connections,
      requestsPerSec: result.requests.average,
      latencyAvg: result.latency.average,
      latencyP99: result.latency.p99,
      errors: result.errors,
    };

    results.push(level);

    console.log(`  Requests/sec: ${level.requestsPerSec}`);
    console.log(`  Latency (avg): ${level.latencyAvg}ms`);
    console.log(`  Latency (p99): ${level.latencyP99}ms`);
    console.log(`  Errors: ${level.errors}`);

    if (result.errors > 0 || result.latency.p99 > 2000) {
      console.log(`\n  Breaking point reached at ${connections} connections`);
      break;
    }
  }

  // Print results table
  console.log(`\n${'='.repeat(60)}`);
  console.log('STRESS TEST RESULTS');
  console.log('='.repeat(60));
  console.log(
    '  Connections | Req/s    | Latency (avg) | Latency (p99) | Errors'
  );
  console.log('  ' + '-'.repeat(70));

  for (const r of results) {
    console.log(
      `  ${String(r.connections).padEnd(11)} | ` +
        `${String(r.requestsPerSec).padEnd(8)} | ` +
        `${String(r.latencyAvg + 'ms').padEnd(13)} | ` +
        `${String(r.latencyP99 + 'ms').padEnd(13)} | ` +
        `${r.errors}`
    );
  }

  // Determine max stable throughput
  const stableLevels = results.filter((r) => r.errors === 0 && r.latencyP99 < 2000);
  if (stableLevels.length > 0) {
    const maxStable = stableLevels[stableLevels.length - 1];
    console.log(
      `\nMax stable connections: ${maxStable.connections} (${maxStable.requestsPerSec} req/s, p99: ${maxStable.latencyP99}ms)`
    );
  } else {
    console.log('\nNo stable connection levels found - server may be under too much load');
  }
}

const API_URL = process.env.API_URL || 'http://localhost:3001';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

stressTest(API_URL, AUTH_TOKEN).catch((err) => {
  console.error('Stress test failed:', err);
  process.exit(1);
});
