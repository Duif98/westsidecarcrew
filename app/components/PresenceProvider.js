"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthProvider";

// Site-wide "who's online" presence. Any logged-in member with the site open is
// tracked on one shared channel, so the hub (and anywhere else) can show who's
// around. Separate channel from the chat's own presence to avoid the "add
// callbacks after subscribe" reuse error.
const PresenceContext = createContext({ online: [] });

export function PresenceProvider({ children }) {
  const { session, user, profile } = useAuth();
  const [online, setOnline] = useState([]);

  useEffect(() => {
    const uid = user?.id, uname = profile?.username;
    if (!session || !uid || !uname) { setOnline([]); return; }

    const channel = supabase.channel("crew-presence", { config: { presence: { key: uid } } });
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const list = Object.values(state)
        .map((metas) => metas[0])
        .filter(Boolean)
        .map((m) => ({ id: m.user_id, username: m.username }));
      // De-dupe by id (a member open in two tabs counts once).
      setOnline(Array.from(new Map(list.map((o) => [o.id, o])).values()));
    });
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") await channel.track({ user_id: uid, username: uname });
    });

    return () => { supabase.removeChannel(channel); };
  }, [session, user?.id, profile?.username]);

  return <PresenceContext.Provider value={{ online }}>{children}</PresenceContext.Provider>;
}

export const usePresence = () => useContext(PresenceContext);
