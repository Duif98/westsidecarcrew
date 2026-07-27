"use client";

import React from "react";

// Turn raw http(s) URLs inside free text into clickable links, so a link pasted
// into a meet description isn't just plain text. Trailing punctuation is left
// outside the link.
export default function Linkify({ text }) {
  if (!text) return null;
  const s = String(text);
  const out = [];
  const re = /(https?:\/\/[^\s]+)/g;
  let last = 0;
  let key = 0;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push(<React.Fragment key={key++}>{s.slice(last, m.index)}</React.Fragment>);
    let url = m[0];
    let trail = "";
    const tm = url.match(/[.,;:!?)\]]+$/);
    if (tm) { trail = tm[0]; url = url.slice(0, url.length - trail.length); }
    out.push(<a key={key++} href={url} target="_blank" rel="noopener noreferrer" className="c-link">{url}</a>);
    if (trail) out.push(<React.Fragment key={key++}>{trail}</React.Fragment>);
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(<React.Fragment key={key++}>{s.slice(last)}</React.Fragment>);
  return out;
}
