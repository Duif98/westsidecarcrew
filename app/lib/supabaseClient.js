import { createClient } from "@supabase/supabase-js";

// These are the project's PUBLIC values. The anon key is designed to be shipped
// in the browser — all access is enforced by row-level security in the database.
const SUPABASE_URL = "https://neezyfqzxhpxhjrefuam.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZXp5ZnF6eGhweGhqcmVmdWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MTIyMDEsImV4cCI6MjA5ODk4ODIwMX0.BPMTyMLGWKeXYZ-suh8ZY8CRpUaIBJRhl-giwUGUgbY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const PUBLIC_BUCKET = "public";
export const PRIVATE_BUCKET = "private";
