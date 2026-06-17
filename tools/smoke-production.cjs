const apiUrl = process.env.TRAVELPOINT_API_URL?.replace(/\/$/, '');
const webUrl = process.env.TRAVELPOINT_WEB_URL?.replace(/\/$/, '');
const jobSecret = process.env.TRAVELPOINT_JOB_SECRET;

if (!apiUrl || !/^https:\/\//.test(apiUrl)) {
  throw new Error('TRAVELPOINT_API_URL must be an HTTPS URL');
}
if (webUrl && !/^https:\/\//.test(webUrl)) {
  throw new Error('TRAVELPOINT_WEB_URL must be an HTTPS URL');
}

async function main() {
  const health = await requestJson(`${apiUrl}/health`);
  assert(health.response.status === 200, `API /health returned ${health.response.status}`);
  assert(health.body.status === 'ok', 'API health payload is not ok');
  assert(health.body.checks?.database === 'ok', 'Database health check is not ok');
  assert(health.body.checks?.postgis === 'ok', 'PostGIS health check is not ok');

  const protectedRoute = await requestJson(`${apiUrl}/api/explorers/me`);
  assert(protectedRoute.response.status === 401, 'Protected route is accessible without a token');

  const billing = await requestJson(`${apiUrl}/api/billing/status`);
  assert(billing.response.status === 401, 'Billing status is accessible without a token');

  const forum = await requestJson(`${apiUrl}/api/forum/posts`);
  assert(forum.response.status === 200, `Forum posts returned ${forum.response.status}`);
  assert(Array.isArray(forum.body), 'Forum posts payload must be an array');

  const journal = await requestJson(`${apiUrl}/api/journal/posts`);
  assert(journal.response.status === 200, `Journal posts returned ${journal.response.status}`);
  assert(Array.isArray(journal.body), 'Journal posts payload must be an array');

  const analytics = await requestJson(`${apiUrl}/api/analytics/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'smoke.production',
      source: 'ci',
      path: '/smoke',
    }),
  });
  assert(analytics.response.status === 204, `Analytics event returned ${analytics.response.status}`);

  if (jobSecret) {
    const retention = await requestJson(`${apiUrl}/internal/jobs/retention/status`, {
      headers: { 'x-job-secret': jobSecret },
    });
    assert(retention.response.status === 200, `Retention status returned ${retention.response.status}`);
    assert(['ok', 'never_run'].includes(retention.body.status), 'Unexpected retention status payload');
  }

  if (webUrl) {
    await assertHtml(webUrl, 'TravelPoint');
    await assertHtml(`${webUrl}/map`, 'Discovery');
    await assertHtml(`${webUrl}/forum`, 'Forum');
    await assertHtml(`${webUrl}/journal`, 'Explorer Journal');
    await assertHtml(`${webUrl}/regulamin`, 'Regulamin');
    await assertHtml(`${webUrl}/polityka-prywatnosci`, 'Polityka');
  }

  console.log('Production smoke test passed');
}

async function requestJson(url, init) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function assertHtml(url, expected) {
  const response = await fetch(url);
  assert(response.status === 200, `${url} returned ${response.status}`);
  const html = await response.text();
  assert(html.includes(expected), `${url} did not include ${expected}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
