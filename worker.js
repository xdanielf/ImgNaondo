import { getHTML } from './html.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (path === '/' || path === '/index.html') {
        return new Response(getHTML(), {
          headers: {
            'Content-Type': 'text/html;charset=UTF-8',
            'Permissions-Policy': 'clipboard-read=(self), clipboard-write=(self)',
            ...corsHeaders
          }
        });
      }

      if (path.startsWith('/img/')) {
        return await handleImage(request, env, path);
      }

      const authError = await enforceAuth(request, env, corsHeaders);
      if (authError) return authError;

      if (path === '/api/auth/verify' && request.method === 'POST') {
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      if (path === '/api/upload' && request.method === 'POST') {
        return await handleUpload(request, env, corsHeaders);
      }

      if (path === '/api/list' && request.method === 'GET') {
        return await handleList(request, env, corsHeaders);
      }

      if (path.startsWith('/api/delete/') && request.method === 'DELETE') {
        return await handleDelete(request, env, corsHeaders, path);
      }

      if (path === '/api/stats' && request.method === 'GET') {
        return await handleStats(request, env, corsHeaders);
      }

      if (path === '/api/rename' && request.method === 'POST') {
        return await handleRename(request, env, corsHeaders);
      }

      if (path === '/api/batch-delete' && request.method === 'POST') {
        return await handleBatchDelete(request, env, corsHeaders);
      }

      if (path === '/api/tags' && request.method === 'GET') {
        return await handleGetTags(request, env, corsHeaders);
      }

      if (path === '/api/sync' && request.method === 'POST') {
        return await handleSync(request, env, corsHeaders);
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('Worker Error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};

async function enforceAuth(request, env, corsHeaders) {
  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const now = Date.now();
  const BLOCK_WINDOW = 15 * 60 * 1000; 
  const MAX_FAILS = 5;

  try {
    const limit = await env.DB.prepare('SELECT fails, last_attempt FROM rate_limits WHERE ip = ?').bind(ip).first();
    
    if (limit && limit.fails >= MAX_FAILS) {
      if (now - limit.last_attempt < BLOCK_WINDOW) {
        const authHeader = request.headers.get('Authorization');
        let isCorrectPassword = false;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7).trim();
          if (env.PASSWORD && token === env.PASSWORD) isCorrectPassword = true;
        }

        if (!isCorrectPassword) {
          return new Response(JSON.stringify({ error: 'Too many failed login attempts. Please try again in 15 minutes.' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      } else {
        await env.DB.prepare('DELETE FROM rate_limits WHERE ip = ?').bind(ip).run();
      }
    }
  } catch(e) { 
    console.error('Rate limit check failed', e);
  }

  const authHeader = request.headers.get('Authorization');
  let valid = false;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (env.PASSWORD && token === env.PASSWORD) valid = true;
  }

  if (!valid) {
    try {
        await env.DB.prepare(
          'INSERT INTO rate_limits (ip, fails, last_attempt) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET fails = fails + 1, last_attempt = ?'
        ).bind(ip, now, now).run();
    } catch (e) { console.error('Rate limit write failed', e); }

    return new Response(JSON.stringify({ error: 'Incorrect password' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  try {
      await env.DB.prepare('DELETE FROM rate_limits WHERE ip = ?').bind(ip).run();
  } catch (e) { console.error('Rate limit clear failed', e); }
  
  return null; 
}

async function handleUpload(request, env, corsHeaders) {
  const formData = await request.formData();
  const file = formData.get('file');
  const customName = formData.get('customName') || '';
  const tags = formData.get('tags') || '';

  if (!file) {
    return new Response(JSON.stringify({ error: 'No file provided' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
  if (!validTypes.includes(file.type)) {
    return new Response(JSON.stringify({ error: 'Unsupported file type' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const filename = `${timestamp}_${randomStr}.${extension}`;

  const normalizedTags = tags.split(',').map(t => t.trim()).filter(Boolean).join(',');
  const uploadTime = new Date().toISOString();

  await env.IMAGES.put(filename, file.stream(), {
    httpMetadata: { contentType: file.type }
  });

  await env.DB.prepare(
    'INSERT INTO images (key, originalName, customName, uploadTime, size, tags, contentType) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(filename, file.name, customName.trim(), uploadTime, file.size, normalizedTags, file.type).run();

  const imageUrl = `${new URL(request.url).origin}/img/${filename}`;

  return new Response(JSON.stringify({
    success: true, filename, url: imageUrl, size: file.size, type: file.type,
    customName: customName.trim(), tags: normalizedTags
  }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
}

async function handleList(request, env, corsHeaders) {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const cursor = url.searchParams.get('cursor'); 
  const search = (url.searchParams.get('search') || '').trim();
  const tag = (url.searchParams.get('tag') || '').trim();
  const sort = url.searchParams.get('sort') || 'time-desc';

  let query = 'SELECT * FROM images WHERE 1=1';
  let params = [];

  if (search) {
    query += ' AND (originalName LIKE ? OR customName LIKE ? OR tags LIKE ?)';
    const likeTerm = `%${search}%`;
    params.push(likeTerm, likeTerm, likeTerm);
  }

  if (tag) {
    query += ' AND tags LIKE ?';
    params.push(`%${tag}%`);
  }

  const offset = parseInt(cursor) || 0;

  if (sort === 'time-asc') query += ' ORDER BY uploadTime ASC';
  else if (sort === 'size-desc') query += ' ORDER BY size DESC';
  else if (sort === 'size-asc') query += ' ORDER BY size ASC';
  else if (sort === 'name-asc') query += ' ORDER BY customName ASC, originalName ASC';
  else if (sort === 'name-desc') query += ' ORDER BY customName DESC, originalName DESC';
  else query += ' ORDER BY uploadTime DESC'; 

  query += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const { results } = await env.DB.prepare(query).bind(...params).all();

  const nextCursor = results.length === limit ? (offset + limit) : null;

  const images = results.map((img) => {
    return {
      key: img.key,
      url: `${new URL(request.url).origin}/img/${img.key}`,
      size: img.size,
      uploadTime: img.uploadTime,
      originalName: img.originalName,
      customName: img.customName || '',
      tags: img.tags || '',
    };
  });

  return new Response(JSON.stringify({
    images,
    nextCursor: nextCursor
  }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
}

async function handleDelete(request, env, corsHeaders, path) {
  const filename = path.replace('/api/delete/', '');
  await env.IMAGES.delete(filename);
  await env.DB.prepare('DELETE FROM images WHERE key = ?').bind(filename).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

async function handleImage(request, env, path) {
  const filename = path.replace('/img/', '');

  const object = await env.IMAGES.get(filename);
  if (!object) return new Response('Image not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000');
  headers.set('Access-Control-Allow-Origin', '*');
  return new Response(object.body, { headers });
}

async function handleStats(request, env, corsHeaders) {
  const stats = await env.DB.prepare(
    'SELECT COUNT(*) as totalImages, SUM(size) as totalSize FROM images'
  ).first();

  const totalImages = stats.totalImages || 0;
  const totalSize = stats.totalSize || 0;

  return new Response(JSON.stringify({
    totalImages,
    totalSize,
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
  }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } });
}

async function handleRename(request, env, corsHeaders) {
  const { filename, customName, tags } = await request.json();
  const normalizedTags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean).join(',') : '';

  await env.DB.prepare(
    'UPDATE images SET customName = ?, tags = ? WHERE key = ?'
  ).bind((customName || '').trim(), normalizedTags, filename).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

async function handleBatchDelete(request, env, corsHeaders) {
  const { filenames } = await request.json();
  if (!Array.isArray(filenames) || filenames.length === 0) {
    return new Response(JSON.stringify({ error: 'Invalid file list' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  for (let i = 0; i < filenames.length; i += 1000) {
    const chunk = filenames.slice(i, i + 1000);
    await env.IMAGES.delete(chunk);
  }

  for (let i = 0; i < filenames.length; i += 100) {
    const chunk = filenames.slice(i, i + 100);
    const placeholders = chunk.map(() => '?').join(',');
    await env.DB.prepare(`DELETE FROM images WHERE key IN (${placeholders})`).bind(...chunk).run();
  }

  return new Response(JSON.stringify({ success: true, deleted: filenames.length }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

async function handleGetTags(request, env, corsHeaders) {
  const { results } = await env.DB.prepare(
    'SELECT tags FROM images WHERE tags IS NOT NULL AND tags != ""'
  ).all();

  const tagCount = {};
  results.forEach(row => {
    row.tags.split(',').forEach(tag => {
      const trimmed = tag.trim();
      if (trimmed) tagCount[trimmed] = (tagCount[trimmed] || 0) + 1;
    });
  });

  const tagList = Object.entries(tagCount)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  return new Response(JSON.stringify({ tags: tagList }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

async function handleSync(request, env, corsHeaders) {
  const { cursor } = await request.json();
  const limit = 500; 

  const listed = await env.IMAGES.list({ limit, include: ['customMetadata'], cursor });
  
  let migrated = 0;
  const statements = [];

  for (const obj of listed.objects) {
      if (obj.key === 'metadata_index.json' || obj.key === 'index.lock') continue;

      const metadata = obj.customMetadata || {};
      const uploadTime = metadata.uploadTime || obj.uploaded.toISOString();
      
      statements.push(
          env.DB.prepare(
            'INSERT OR IGNORE INTO images (key, originalName, customName, uploadTime, size, tags, contentType) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            obj.key,
            metadata.originalName || obj.key,
            metadata.customName || '',
            uploadTime,
            parseInt(metadata.size || obj.size || 0),
            metadata.tags || '',
            obj.httpMetadata?.contentType || ''
          )
      );
      migrated++;
  }

  if (statements.length > 0) {
      await env.DB.batch(statements);
  }

  return new Response(JSON.stringify({ 
      success: true, 
      migrated, 
      cursor: listed.truncated ? listed.cursor : null 
  }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}