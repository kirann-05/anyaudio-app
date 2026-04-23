require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials missing. App will fail on DB operations.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function initDB() {
  console.log('✅ Connected to Supabase');
  // No explicit initialization needed for Supabase as tables are created via SQL editor
}

// User
async function getOrCreateUser(username) {
  try {
    const { data: existingUser, error: searchError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle(); // Better than single() if it might not exist

    if (existingUser) return existingUser;

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{ username }])
      .select()
      .single();

    if (insertError) {
      console.error('Supabase Insert Error:', insertError);
      throw insertError;
    }
    return newUser;
  } catch (err) {
    console.error('DB Error in getOrCreateUser:', err);
    throw err;
  }
}

async function getUser(id) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) return null;
  return data;
}

// Collections
async function saveCollection(userId, url, title, tracks) {
  const { data: col, error: colErr } = await supabase
    .from('collections')
    .insert([{ user_id: userId, url, title }])
    .select()
    .single();

  if (colErr) throw colErr;

  const tracksToInsert = tracks.map((t, i) => ({
    collection_id: col.id,
    track_index: i,
    title: t.title,
    audio_url: t.audioUrl,
    duration: t.duration || 0,
    downloaded: false
  }));

  const { error: trackErr } = await supabase
    .from('tracks')
    .insert(tracksToInsert);

  if (trackErr) throw trackErr;

  return getCollection(col.id);
}

async function getCollections(userId) {
  const { data: cols, error } = await supabase
    .from('collections')
    .select(`
      *,
      tracks (*),
      progress:progress (track_index, current_pos, completed)
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  // Flatten and normalize for frontend (Supabase returns arrays for joins)
  return cols.map(c => ({
    ...c,
    tracks: c.tracks.sort((a, b) => a.track_index - b.track_index),
    trackIndex: c.progress?.[0]?.track_index || 0,
    currentTime: c.progress?.[0]?.current_pos || 0,
    completed: c.progress?.[0]?.completed || 0
  }));
}

async function getCollection(id) {
  const { data: col, error } = await supabase
    .from('collections')
    .select(`
      *,
      tracks (*)
    `)
    .eq('id', id)
    .single();

  if (error) return null;

  return {
    ...col,
    tracks: col.tracks.sort((a, b) => a.track_index - b.track_index)
  };
}

async function deleteCollection(id) {
  const { error } = await supabase
    .from('collections')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// Track Download state
async function markTrackDownloaded(trackId, localFilename) {
  const { error } = await supabase
    .from('tracks')
    .update({ downloaded: true, local_filename: localFilename })
    .eq('id', trackId);
  
  if (error) throw error;
}

// Progress
async function saveProgress(userId, collectionId, trackIndex, currentTime, completed) {
  const { error } = await supabase
    .from('progress')
    .upsert({
      user_id: userId,
      collection_id: collectionId,
      track_index: trackIndex,
      current_pos: currentTime,
      completed,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,collection_id' });

  if (error) throw error;

  // Also update collection timestamp
  await supabase
    .from('collections')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', collectionId);
}

async function getProgress(userId, collectionId) {
  const { data, error } = await supabase
    .from('progress')
    .select('*')
    .eq('user_id', userId)
    .eq('collection_id', collectionId)
    .single();
  
  if (error) return null;
  return data;
}

// Playlists
async function createPlaylist(userId, name, description) {
  const { data, error } = await supabase
    .from('playlists')
    .insert([{ user_id: userId, name, description }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getPlaylists(userId) {
  const { data, error } = await supabase
    .from('playlists')
    .select(`
      *,
      trackCount:playlist_tracks (count)
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  
  return data.map(p => ({
    ...p,
    trackCount: p.trackCount?.[0]?.count || 0
  }));
}

async function getPlaylist(id) {
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

async function addToPlaylist(playlistId, collectionId, trackIndices) {
  const inserts = trackIndices.map(idx => ({
    playlist_id: playlistId,
    collection_id: collectionId,
    track_index: idx
  }));

  const { error } = await supabase
    .from('playlist_tracks')
    .insert(inserts);

  if (error) throw error;

  await supabase
    .from('playlists')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', playlistId);
}

async function removeFromPlaylist(playlistId, trackId) {
  const { error } = await supabase
    .from('playlist_tracks')
    .delete()
    .eq('id', trackId)
    .eq('playlist_id', playlistId);
  
  if (error) throw error;
}

async function deletePlaylist(id) {
  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

module.exports = {
  initDB,
  getOrCreateUser, getUser,
  saveCollection, getCollections, getCollection, deleteCollection, markTrackDownloaded,
  saveProgress, getProgress,
  createPlaylist, getPlaylists, getPlaylist, addToPlaylist, removeFromPlaylist, deletePlaylist
};
