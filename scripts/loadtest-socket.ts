/** Connection-only staging probe. See docs/load-test-runbook.md. */
import { configuration, runConnections } from './loadtest/connections.mjs';

try {
  const report = await runConnections(configuration());
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.pass ? 0 : 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Load test failed');
  process.exitCode = 2;
}
