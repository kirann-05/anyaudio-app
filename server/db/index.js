const path = require('path');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

let supabase = null;
let useLocal = false;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase credentials missing — using local SQLite.');
  useLocal = true;
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// ---------------- LOCAL SQLITE ----------------
const fs = require('fs');
const initSqlJs = require('sql.js');
const dbPath = path.join(__dirname, '../data/anyaudio.db');
let db = null;

const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE)",
  "CREATE TABLE IF NOT EXISTS collections (id TEXT PRIMARY KEY, user_id TEXT, url TEXT, title TEXT, updated_at TEXT)",
  "CREATE TABLE IF NOT EXISTS tracks (id TEXT PRIMARY KEY, collection_id TEXT, track_index INTEGER, title TEXT, audio_url TEXT, duration INTEGER, downloaded BOOLEAN DEFAULT 0, local_filename TEXT, transcript TEXT)",
  "CREATE TABLE IF NOT EXISTS progress (user_id TEXT, collection_id TEXT, track_index INTEGER, current_time REAL, completed INTEGER DEFAULT 0, updated_at TEXT, PRIMARY KEY (user_id, collection_id))",
  "CREATE TABLE IF NOT EXISTS playlists (id TEXT PRIMARY KEY, user_id TEXT, name TEXT, description TEXT, updated_at TEXT)",
  "CREATE TABLE IF NOT EXISTS playlist_tracks (id TEXT PRIMARY KEY, playlist_id TEXT, collection_id TEXT, track_index INTEGER, added_at TEXT)",
];

async function initDB() {
  if (!useLocal) {
    console.log('✅ Connected to Supabase');
    return;
  }
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    db = new SQL.Database();
  }
  // Always ensure schema (handles existing DB with missing tables/columns)
  SCHEMA.forEach(stmt => db.run(stmt));
  saveLocalDB();
  console.log('✅ Connected to Local SQLite');
}

function saveLocalDB() {
  if (!useLocal || !db) return;
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

const genId = () => Math.random().toString(36).substring(2, 15);

// Helper: safely query and return rows array
function query(sql, params = []) {
  try {
    const res = db.exec(sql, params);
    return res[0]?.values || [];
  } catch (err) {
    console.error('SQLite query error:', err.message, '| SQL:', sql);
    return [];
  }
}

// ===================== USERS =====================
async function getOrCreateUser(username) {
  if (useLocal) {
    const rows = query("SELECT id, username FROM users WHERE username = ?", [username]);
    if (rows.length > 0) return { id: rows[0][0], username: rows[0][1] };
    const id = genId();
    db.run("INSERT INTO users (id, username) VALUES (?, ?)", [id, username]);
    saveLocalDB();
    return { id, username };
  }
  const { data: existing } = await supabase.from('users').select('*').eq('username', username).maybeSingle();
  if (existing) return existing;
  const { data, error } = await supabase.from('users').insert([{ username }]).select().single();
  if (error) throw error;
  return data;
}

async function getUser(id) {
  if (useLocal) {
    const rows = query("SELECT id, username FROM users WHERE id = ?", [id]);
    return rows.length > 0 ? { id: rows[0][0], username: rows[0][1] } : null;
  }
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  return error ? null : data;
}

// ===================== COLLECTIONS =====================
async function saveCollection(userId, url, title, tracks) {
  if (useLocal) {
    const colId = genId();
    db.run("INSERT INTO collections (id, user_id, url, title, updated_at) VALUES (?, ?, ?, ?, ?)",
      [colId, userId, url, title, new Date().toISOString()]);
    tracks.forEach((t, i) => {
      db.run("INSERT INTO tracks (id, collection_id, track_index, title, audio_url, duration, downloaded, transcript) VALUES (?, ?, ?, ?, ?, ?, 0, ?)",
        [genId(), colId, i, t.title, t.audioUrl, t.duration || 0, t.transcript || null]);
    });
    saveLocalDB();
    return getCollection(colId);
  }
  const { data: col, error: colErr } = await supabase.from('collections').insert([{ user_id: userId, url, title }]).select().single();
  if (colErr) throw colErr;
  const rows = tracks.map((t, i) => ({ collection_id: col.id, track_index: i, title: t.title, audio_url: t.audioUrl, duration: t.duration || 0, downloaded: false, transcript: t.transcript || null }));
  const { error: trErr } = await supabase.from('tracks').insert(rows);
  if (trErr) throw trErr;
  return getCollection(col.id);
}

async function getCollections(userId) {
  if (useLocal) {
    const cols = query("SELECT id, user_id, url, title, updated_at FROM collections WHERE user_id = ? ORDER BY updated_at DESC", [userId]);
    return cols.map(r => {
      const tr = query("SELECT id, collection_id, track_index, title, audio_url, duration, downloaded, local_filename, transcript FROM tracks WHERE collection_id = ? ORDER BY track_index", [r[0]]);
      const pr = query("SELECT track_index, current_time, completed FROM progress WHERE user_id = ? AND collection_id = ?", [userId, r[0]]);
      return {
        id: r[0], user_id: r[1], url: r[2], title: r[3], updated_at: r[4],
        tracks: tr.map(t => ({ id: t[0], collection_id: t[1], track_index: t[2], title: t[3], audio_url: t[4], duration: t[5], downloaded: !!t[6], local_filename: t[7], transcript: t[8] })),
        trackIndex: pr[0]?.[0] || 0, currentTime: pr[0]?.[1] || 0, completed: pr[0]?.[2] || 0,
      };
    });
  }
  const { data, error } = await supabase.from('collections').select('*, tracks (*), progress:progress (track_index, current_pos, completed)').eq('user_id', userId).order('updated_at', { ascending: false });
  if (error) throw error;
  return data.map(c => ({
    ...c,
    tracks: c.tracks.sort((a, b) => a.track_index - b.track_index),
    trackIndex: c.progress?.[0]?.track_index || 0,
    currentTime: c.progress?.[0]?.current_pos || 0,
    completed: c.progress?.[0]?.completed || 0,
  }));
}

async function getCollection(id) {
  if (useLocal) {
    const cols = query("SELECT id, user_id, url, title, updated_at FROM collections WHERE id = ?", [id]);
    if (cols.length === 0) return null;
    const r = cols[0];
    const tr = query("SELECT id, collection_id, track_index, title, audio_url, duration, downloaded, local_filename, transcript FROM tracks WHERE collection_id = ? ORDER BY track_index", [id]);
    return {
      id: r[0], user_id: r[1], url: r[2], title: r[3], updated_at: r[4],
      tracks: tr.map(t => ({ id: t[0], collection_id: t[1], track_index: t[2], title: t[3], audio_url: t[4], duration: t[5], downloaded: !!t[6], local_filename: t[7], transcript: t[8] })),
    };
  }
  const { data, error } = await supabase.from('collections').select('*, tracks (*)').eq('id', id).single();
  if (error) return null;
  return { ...data, tracks: data.tracks.sort((a, b) => a.track_index - b.track_index) };
}

async function deleteCollection(id) {
  if (useLocal) {
    db.run("DELETE FROM tracks WHERE collection_id = ?", [id]);
    db.run("DELETE FROM progress WHERE collection_id = ?", [id]);
    db.run("DELETE FROM collections WHERE id = ?", [id]);
    saveLocalDB();
    return;
  }
  await supabase.from('collections').delete().eq('id', id);
}

async function markTrackDownloaded(trackId, localFilename) {
  if (useLocal) {
    db.run("UPDATE tracks SET downloaded = 1, local_filename = ? WHERE id = ?", [localFilename, trackId]);
    saveLocalDB();
    return;
  }
  await supabase.from('tracks').update({ downloaded: true, local_filename: localFilename }).eq('id', trackId);
}

// ===================== PROGRESS =====================
async function saveProgress(userId, collectionId, trackIndex, currentTime, completed) {
  if (useLocal) {
    db.run("INSERT OR REPLACE INTO progress (user_id, collection_id, track_index, current_time, completed, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, collectionId, trackIndex, currentTime, completed || 0, new Date().toISOString()]);
    db.run("UPDATE collections SET updated_at = ? WHERE id = ?", [new Date().toISOString(), collectionId]);
    saveLocalDB();
    return;
  }
  await supabase.from('progress').upsert({ user_id: userId, collection_id: collectionId, track_index: trackIndex, current_pos: currentTime, completed: completed || 0, updated_at: new Date().toISOString() }, { onConflict: 'user_id,collection_id' });
  await supabase.from('collections').update({ updated_at: new Date().toISOString() }).eq('id', collectionId);
}

async function getProgress(userId, collectionId) {
  if (useLocal) {
    const rows = query("SELECT track_index, current_time, completed FROM progress WHERE user_id = ? AND collection_id = ?", [userId, collectionId]);
    return rows.length > 0 ? { trackIndex: rows[0][0], currentTime: rows[0][1], completed: rows[0][2] } : null;
  }
  const { data, error } = await supabase.from('progress').select('*').eq('user_id', userId).eq('collection_id', collectionId).single();
  return error ? null : data;
}

// ===================== PLAYLISTS =====================
async function createPlaylist(userId, name, description) {
  if (useLocal) {
    const id = genId();
    db.run("INSERT INTO playlists (id, user_id, name, description, updated_at) VALUES (?, ?, ?, ?, ?)", [id, userId, name, description || '', new Date().toISOString()]);
    saveLocalDB();
    return { id, user_id: userId, name, description };
  }
  const { data, error } = await supabase.from('playlists').insert([{ user_id: userId, name, description }]).select().single();
  if (error) throw error;
  return data;
}

async function getPlaylists(userId) {
  if (useLocal) {
    const rows = query("SELECT id, user_id, name, description, updated_at FROM playlists WHERE user_id = ? ORDER BY updated_at DESC", [userId]);
    return rows.map(r => ({ id: r[0], user_id: r[1], name: r[2], description: r[3], updated_at: r[4], trackCount: 0 }));
  }
  const { data, error } = await supabase.from('playlists').select('*, trackCount:playlist_tracks (count)').eq('user_id', userId).order('updated_at', { ascending: false });
  if (error) throw error;
  return data.map(p => ({ ...p, trackCount: p.trackCount?.[0]?.count || 0 }));
}

async function getPlaylist(id) {
  if (useLocal) {
    const rows = query("SELECT id, user_id, name, description FROM playlists WHERE id = ?", [id]);
    return rows.length > 0 ? { id: rows[0][0], user_id: rows[0][1], name: rows[0][2], description: rows[0][3] } : null;
  }
  const { data, error } = await supabase.from('playlists').select('*').eq('id', id).single();
  return error ? null : data;
}

async function addToPlaylist(playlistId, collectionId, trackIndices) {
  if (useLocal) {
    trackIndices.forEach(idx => {
      db.run("INSERT INTO playlist_tracks (id, playlist_id, collection_id, track_index, added_at) VALUES (?, ?, ?, ?, ?)", [genId(), playlistId, collectionId, idx, new Date().toISOString()]);
    });
    db.run("UPDATE playlists SET updated_at = ? WHERE id = ?", [new Date().toISOString(), playlistId]);
    saveLocalDB();
    return;
  }
  await supabase.from('playlist_tracks').insert(trackIndices.map(idx => ({ playlist_id: playlistId, collection_id: collectionId, track_index: idx })));
  await supabase.from('playlists').update({ updated_at: new Date().toISOString() }).eq('id', playlistId);
}

async function removeFromPlaylist(playlistId, trackId) {
  if (useLocal) {
    db.run("DELETE FROM playlist_tracks WHERE id = ? AND playlist_id = ?", [trackId, playlistId]);
    saveLocalDB();
    return;
  }
  await supabase.from('playlist_tracks').delete().eq('id', trackId).eq('playlist_id', playlistId);
}

async function deletePlaylist(id) {
  if (useLocal) {
    db.run("DELETE FROM playlist_tracks WHERE playlist_id = ?", [id]);
    db.run("DELETE FROM playlists WHERE id = ?", [id]);
    saveLocalDB();
    return;
  }
  await supabase.from('playlists').delete().eq('id', id);
}

module.exports = {
  initDB,
  getOrCreateUser, getUser,
  saveCollection, getCollections, getCollection, deleteCollection, markTrackDownloaded,
  saveProgress, getProgress,
  createPlaylist, getPlaylists, getPlaylist, addToPlaylist, removeFromPlaylist, deletePlaylist
};
