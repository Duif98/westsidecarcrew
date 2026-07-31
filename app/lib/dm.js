import { supabase, PUBLIC_BUCKET } from "./supabaseClient";

// 1:1 direct messages. One flat table (dm_messages); threads are derived
// client-side by grouping on the other party — fine for a small crew.

export const dmImageUrl = (path) => supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;

// All messages I'm part of, newest first, collapsed into one row per other
// member: { otherId, last, lastAt, fromMe, unread }.
export async function fetchThreads(myId) {
  const { data, error } = await supabase
    .from("dm_messages")
    .select("id, sender_id, recipient_id, content, image_path, created_at, read_at")
    .or(`sender_id.eq.${myId},recipient_id.eq.${myId}`)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  const threads = new Map();
  (data || []).forEach((m) => {
    const other = m.sender_id === myId ? m.recipient_id : m.sender_id;
    if (!threads.has(other)) {
      threads.set(other, { otherId: other, last: m, lastAt: m.created_at, fromMe: m.sender_id === myId, unread: 0 });
    }
    // unread = messages sent to me that I haven't read
    if (m.recipient_id === myId && !m.read_at) threads.get(other).unread++;
  });
  return [...threads.values()];
}

export async function fetchConversation(myId, otherId) {
  const { data, error } = await supabase
    .from("dm_messages")
    .select("id, sender_id, recipient_id, content, image_path, created_at, read_at")
    .or(`and(sender_id.eq.${myId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${myId})`)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function sendDM({ senderId, recipientId, content, imagePath }) {
  const { data, error } = await supabase
    .from("dm_messages")
    .insert({ sender_id: senderId, recipient_id: recipientId, content: (content || "").slice(0, 2000), image_path: imagePath || null })
    .select("id, sender_id, recipient_id, content, image_path, created_at, read_at")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Mark everything the other person sent me as read.
export async function markConversationRead(myId, otherId) {
  await supabase
    .from("dm_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", myId)
    .eq("sender_id", otherId)
    .is("read_at", null);
}

// Total unread across all conversations (for the nav badge). Fail-safe: 0 if
// 034 isn't run yet.
export async function unreadDMCount(myId) {
  try {
    const { count, error } = await supabase
      .from("dm_messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", myId)
      .is("read_at", null);
    if (error) throw error;
    return count || 0;
  } catch {
    return 0;
  }
}
