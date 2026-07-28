// The live, subscribable meets calendar (served by the calendar-feed Edge
// Function). webcal:// makes phones/desktops offer to subscribe so every future
// meet syncs in automatically; https:// is the same feed for "add by URL".
const FEED_PATH = "/functions/v1/calendar-feed";
const SUPABASE_HOST = "neezyfqzxhpxhjrefuam.supabase.co";

export const CALENDAR_FEED_WEBCAL = `webcal://${SUPABASE_HOST}${FEED_PATH}`;
export const CALENDAR_FEED_HTTPS = `https://${SUPABASE_HOST}${FEED_PATH}`;
