/**
 * Apify Facebook Groups Scraper integration.
 * Supports apify/facebook-groups-scraper (public groups) and
 * curious_coder/facebook-post-scraper (private groups with cookies).
 *
 * @see https://apify.com/apify/facebook-groups-scraper/input-schema
 * @see https://apify.com/curious_coder/facebook-post-scraper (for private groups)
 */

const APIFY_BASE = 'https://api.apify.com/v2';
const FACEBOOK_GROUPS_ACTOR = 'apify~facebook-groups-scraper';

export type ViewOption = 'CHRONOLOGICAL' | 'RECENT_ACTIVITY' | 'TOP_POSTS' | 'CHRONOLOGICAL_LISTINGS';

export interface ApifyRunInput {
  /** Facebook group URLs - e.g. https://www.facebook.com/groups/123456789 */
  startUrls: { url: string }[];
  /** Max number of posts to scrape (default 50) */
  resultsLimit?: number;
  /** Sort order for posts */
  viewOption?: ViewOption;
  /** Posts newer than this date (YYYY-MM-DD or relative e.g. "7 days") */
  onlyPostsNewerThan?: string;
  /**
   * Cookies for private groups. Export from Cookie-Editor extension (facebook.com).
   * Required for private groups - the official apify/facebook-groups-scraper
   * only supports PUBLIC groups. For private groups, use a different actor
   * that supports cookies (e.g. curious_coder/facebook-post-scraper).
   */
  cookies?: string;
  /** Optional: pass cookies as JSON array (alternative format) */
  cookiesJson?: Array<{ name: string; value: string; domain?: string }>;
}

export interface ApifyRunResult {
  id: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  buildId: string;
  exitCode?: number;
}

export interface ApifyRunStatus {
  id: string;
  status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTING' | 'ABORTED' | 'TIMING-OUT';
  startedAt: string;
  finishedAt?: string;
  stats?: { itemsCount?: number };
  defaultDatasetId?: string;
}

function getApiToken(): string {
  const token = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error('APIFY_API_TOKEN or APIFY_TOKEN is not configured. Add it to .env.local');
  }
  return token;
}

/**
 * Build runInput for apify/facebook-groups-scraper.
 * Ensures correct parameters for group scraping.
 */
export function buildRunInput(input: ApifyRunInput): Record<string, unknown> {
  const runInput: Record<string, unknown> = {
    startUrls: input.startUrls.map((u) =>
      typeof u === 'string' ? { url: u } : { url: u.url }
    ),
    resultsLimit: input.resultsLimit ?? 50,
    viewOption: input.viewOption ?? 'CHRONOLOGICAL',
  };

  if (input.onlyPostsNewerThan) {
    runInput.onlyPostsNewerThan = input.onlyPostsNewerThan;
  }

  // Cookies: apify/facebook-groups-scraper is for PUBLIC groups only.
  // If you need private groups, use curious_coder/facebook-post-scraper
  // which accepts cookies in a different format.
  if (input.cookies) {
    runInput.cookies = input.cookies;
  }
  if (input.cookiesJson && input.cookiesJson.length > 0) {
    runInput.cookies = JSON.stringify(input.cookiesJson);
  }

  return runInput;
}

/**
 * Start an Apify actor run.
 */
export async function startApifyRun(
  input: ApifyRunInput,
  options?: { webhookUrl?: string }
): Promise<ApifyRunResult> {
  const token = getApiToken();
  const runInput = buildRunInput(input);

  const body: Record<string, unknown> = runInput;
  if (options?.webhookUrl) {
    body.webhooks = [
      {
        eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED'],
        requestUrl: options.webhookUrl,
      },
    ];
  }

  const res = await fetch(
    `${APIFY_BASE}/acts/${FACEBOOK_GROUPS_ACTOR}/runs?token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Apify run failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { data: ApifyRunResult };
  return data.data;
}

/**
 * Check the status of an Apify run.
 */
export async function getRunStatus(runId: string): Promise<ApifyRunStatus> {
  const token = getApiToken();
  const res = await fetch(
    `${APIFY_BASE}/actor-runs/${runId}?token=${token}`,
    { method: 'GET' }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Apify status check failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { data: ApifyRunStatus };
  return data.data;
}

/**
 * Wait for run to complete (polling), then return dataset items.
 * Use this to ensure status is SUCCEEDED before parsing results.
 */
export async function waitForRunAndGetResults(
  runId: string,
  options?: { maxWaitMs?: number; pollIntervalMs?: number }
): Promise<unknown[]> {
  const maxWait = options?.maxWaitMs ?? 5 * 60 * 1000; // 5 min
  const pollInterval = options?.pollIntervalMs ?? 5000; // 5 sec
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    const status = await getRunStatus(runId);

    if (status.status === 'SUCCEEDED') {
      return fetchDatasetItems(runId);
    }
    if (status.status === 'FAILED' || status.status === 'ABORTED') {
      throw new Error(`Apify run ${runId} failed with status: ${status.status}`);
    }

    await new Promise((r) => setTimeout(r, pollInterval));
  }

  throw new Error(`Apify run ${runId} timed out after ${maxWait}ms`);
}

/**
 * Fetch dataset items from a completed run.
 * Uses the run's defaultDatasetId to fetch items.
 */
export async function fetchDatasetItems(runId: string): Promise<unknown[]> {
  const token = getApiToken();

  // Get run to retrieve defaultDatasetId
  const runRes = await fetch(
    `${APIFY_BASE}/actor-runs/${runId}?token=${token}`,
    { method: 'GET' }
  );
  if (!runRes.ok) {
    const errText = await runRes.text();
    throw new Error(`Apify run fetch failed (${runRes.status}): ${errText}`);
  }
  const runData = (await runRes.json()) as { data: ApifyRunStatus };
  const datasetId = runData.data.defaultDatasetId;
  if (!datasetId) {
    throw new Error(`Run ${runId} has no default dataset`);
  }

  const res = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?token=${token}`,
    { method: 'GET' }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Apify dataset fetch failed (${res.status}): ${errText}`);
  }

  const items = (await res.json()) as unknown[];
  return Array.isArray(items) ? items : [];
}
