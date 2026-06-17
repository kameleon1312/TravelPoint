const apiUrl = process.env.TRAVELPOINT_API_URL?.replace(/\/$/, '');
const jobSecret = process.env.TRAVELPOINT_JOB_SECRET;

if (!apiUrl || !/^https:\/\//.test(apiUrl)) {
  throw new Error('TRAVELPOINT_API_URL must be an HTTPS URL');
}

async function main() {
  const health = await request('/health');
  assert(health.response.status === 200, `Health returned ${health.response.status}`);
  assert(health.body.status === 'ok', 'Health payload is not ok');

  const protectedRoute = await request('/api/explorers/me');
  assert(protectedRoute.response.status === 401, 'Protected route is accessible without a token');

  if (jobSecret) {
    const retention = await request('/internal/jobs/retention/status', {
      headers: { 'x-job-secret': jobSecret },
    });
    assert(retention.response.status === 200, `Retention status returned ${retention.response.status}`);
    assert(
      ['ok', 'never_run'].includes(retention.body.status),
      'Unexpected retention status payload',
    );
  }

  console.log('Preview API smoke test passed');
}

async function request(path, init) {
  const response = await fetch(`${apiUrl}${path}`, init);
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
