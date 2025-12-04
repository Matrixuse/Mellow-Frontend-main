/*
Node script to check coverUrl validity for songs and playlists.
Usage:
  NODE_OPTIONS=--experimental-fetch node scripts/check_cover_urls.js --token <TOKEN> [--apiUrl <API_URL>]
Or set env vars: API_URL and TOKEN.

It performs HEAD requests for each cover URL and writes a report at ./cover_url_report.json
*/

const fs = require('fs');
const { argv, env } = require('process');

function parseArgs() {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if ((a === '--token' || a === '-t') && argv[i+1]) { args.token = argv[++i]; }
    else if ((a === '--apiUrl' || a === '-a') && argv[i+1]) { args.apiUrl = argv[++i]; }
  }
  return args;
}

(async () => {
  const args = parseArgs();
  const API_URL = (args.apiUrl || env.API_URL || env.VITE_API_URL || 'https://mellow-1.onrender.com').replace(/\/$/, '');
  const TOKEN = args.token || env.TOKEN;

  if (!TOKEN) {
    console.error('No TOKEN provided. Pass --token <TOKEN> or set TOKEN env var.');
    process.exit(1);
  }

  const endpoints = [
    `${API_URL}/api/songs`,
    `${API_URL}/api/playlists`
  ];

  async function fetchJson(url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!res.ok) {
      throw new Error(`${url} returned ${res.status}`);
    }
    return res.json();
  }

  const report = { timestamp: new Date().toISOString(), badUrls: [] };

  try {
    console.log('Fetching songs...');
    const songs = await fetchJson(`${API_URL}/api/songs`);
    if (Array.isArray(songs)) {
      for (const s of songs) {
        const url = s.coverUrl || s.cover_url || s.cover || '';
        if (!url) continue;
        try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), 5000);
          const r = await fetch(url, { method: 'HEAD', signal: controller.signal });
          clearTimeout(id);
          if (!r.ok) {
            report.badUrls.push({ type: 'song', id: s.id || s._id || null, title: s.title || null, url, status: r.status });
            console.log('BAD:', url, '->', r.status);
          }
        } catch (err) {
          report.badUrls.push({ type: 'song', id: s.id || s._id || null, title: s.title || null, url, error: String(err) });
          console.log('ERR:', url, String(err));
        }
      }
    }

    console.log('Fetching playlists...');
    const pls = await fetchJson(`${API_URL}/api/playlists`);
    if (Array.isArray(pls)) {
      for (const p of pls) {
        const pUrl = p.coverUrl || p.cover_url || '';
        if (pUrl) {
          try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 5000);
            const r = await fetch(pUrl, { method: 'HEAD', signal: controller.signal });
            clearTimeout(id);
            if (!r.ok) {
              report.badUrls.push({ type: 'playlist', id: p.id || p._id || null, name: p.name || null, url: pUrl, status: r.status });
              console.log('BAD:', pUrl, '->', r.status);
            }
          } catch (err) {
            report.badUrls.push({ type: 'playlist', id: p.id || p._id || null, name: p.name || null, url: pUrl, error: String(err) });
            console.log('ERR:', pUrl, String(err));
          }
        }

        if (Array.isArray(p.songs)) {
          for (const s of p.songs) {
            const url = s.coverUrl || s.cover_url || s.cover || '';
            if (!url) continue;
            try {
              const controller = new AbortController();
              const id = setTimeout(() => controller.abort(), 5000);
              const r = await fetch(url, { method: 'HEAD', signal: controller.signal });
              clearTimeout(id);
              if (!r.ok) {
                report.badUrls.push({ type: 'playlist-song', playlistId: p.id || p._id || null, songId: s.id || s._id || null, title: s.title || null, url, status: r.status });
                console.log('BAD:', url, '->', r.status);
              }
            } catch (err) {
              report.badUrls.push({ type: 'playlist-song', playlistId: p.id || p._id || null, songId: s.id || s._id || null, title: s.title || null, url, error: String(err) });
              console.log('ERR:', url, String(err));
            }
          }
        }
      }
    }

    fs.writeFileSync('cover_url_report.json', JSON.stringify(report, null, 2), 'utf8');
    console.log('Report written to cover_url_report.json — found', report.badUrls.length, 'bad URLs');
  } catch (err) {
    console.error('Failed to run checks:', err);
    process.exitCode = 1;
  }
})();
