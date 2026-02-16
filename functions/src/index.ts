import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

const CACHE_COLLECTION = 'fb_image_cache';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const fbImageProxy = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const fbid = req.query.fbid as string;
  if (!fbid || !/^\d+$/.test(fbid)) {
    res.status(400).json({ error: 'Missing or invalid fbid parameter.' });
    return;
  }

  try {
    const cacheDoc = await db.collection(CACHE_COLLECTION).doc(fbid).get();
    if (cacheDoc.exists) {
      const data = cacheDoc.data()!;
      const age = Date.now() - (data.cachedAt || 0);
      if (age < CACHE_TTL_MS && data.imageUrl) {
        res.set('Cache-Control', 'public, max-age=86400');
        res.redirect(302, data.imageUrl);
        return;
      }
    }

    const photoPageUrl = `https://www.facebook.com/photo.php?fbid=${fbid}`;
    const response = await fetch(photoPageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      res.status(502).json({ error: 'Failed to fetch Facebook photo page' });
      return;
    }

    const html = await response.text();
    let imageUrl = extractOgImage(html) || extractScontentUrl(html);

    if (!imageUrl) {
      res.set('Content-Type', 'image/png');
      res.send(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));
      return;
    }

    imageUrl = imageUrl.replace(/&amp;/g, '&').replace(/&#x2F;/g, '/').replace(/&#x3A;/g, ':');

    await db.collection(CACHE_COLLECTION).doc(fbid).set({
      imageUrl,
      photoPageUrl,
      cachedAt: Date.now(),
    });

    res.set('Cache-Control', 'public, max-age=86400');
    res.redirect(302, imageUrl);

  } catch (error) {
    console.error(`Error resolving fbid=${fbid}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function extractOgImage(html: string): string | null {
  const m1 = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (m1) return m1[1];
  const m2 = html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
  if (m2) return m2[1];
  return null;
}

function extractScontentUrl(html: string): string | null {
  const m = html.match(/(https?:\/\/scontent[^"'\s\\]+\.(?:jpg|jpeg|png|webp)[^"'\s\\]*)/i);
  if (m) return m[1].replace(/\\u0025/g, '%').replace(/\\\//g, '/');
  return null;
}