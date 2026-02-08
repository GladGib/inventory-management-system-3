import autocannon from 'autocannon';

interface LoadTestConfig {
  url: string;
  duration: number;
  connections: number;
  headers?: Record<string, string>;
}

async function runLoadTest(config: LoadTestConfig) {
  console.log(`Starting load test: ${config.url}`);
  console.log(`Duration: ${config.duration}s, Connections: ${config.connections}`);

  const result = await autocannon({
    url: config.url,
    duration: config.duration,
    connections: config.connections,
    headers: config.headers,
  });

  console.log('\n=== RESULTS ===');
  console.log(`Requests/sec: ${result.requests.average}`);
  console.log(`Latency (avg): ${result.latency.average}ms`);
  console.log(`Latency (p99): ${result.latency.p99}ms`);
  console.log(`Throughput: ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s`);
  console.log(`Total Requests: ${result.requests.total}`);
  console.log(`Errors: ${result.errors}`);
  console.log(`Timeouts: ${result.timeouts}`);

  // Performance thresholds
  const passed = result.latency.p99 < 500 && result.errors === 0;
  console.log(`\nStatus: ${passed ? 'PASSED' : 'FAILED'}`);

  return result;
}

// Test configurations
const API_URL = process.env.API_URL || 'http://localhost:3001';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

const tests = [
  {
    name: 'Health Check',
    config: {
      url: `${API_URL}/api/health`,
      duration: 10,
      connections: 50,
    },
  },
  {
    name: 'Items List (Authenticated)',
    config: {
      url: `${API_URL}/api/items`,
      duration: 10,
      connections: 20,
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    },
  },
  {
    name: 'Dashboard Stats',
    config: {
      url: `${API_URL}/api/dashboard/stats`,
      duration: 10,
      connections: 20,
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    },
  },
];

async function main() {
  console.log('='.repeat(60));
  console.log('IMS API Load Test Suite');
  console.log('='.repeat(60));
  console.log(`Target: ${API_URL}`);
  console.log(`Auth Token: ${AUTH_TOKEN ? 'Provided' : 'Not provided'}`);
  console.log('');

  const results: Array<{ name: string; passed: boolean }> = [];

  for (const test of tests) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Test: ${test.name}`);
    console.log('='.repeat(50));

    const result = await runLoadTest(test.config);
    const passed = result.latency.p99 < 500 && result.errors === 0;
    results.push({ name: test.name, passed });
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));
  for (const r of results) {
    console.log(`  ${r.passed ? 'PASS' : 'FAIL'}  ${r.name}`);
  }

  const allPassed = results.every((r) => r.passed);
  console.log(`\nOverall: ${allPassed ? 'ALL PASSED' : 'SOME FAILED'}`);

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Load test failed:', err);
  process.exit(1);
});
