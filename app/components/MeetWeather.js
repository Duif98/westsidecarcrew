"use client";

import { useEffect, useState } from "react";
import { fetchMeetWeather } from "../lib/weather";

// Weather forecast for a meet's start time. Renders nothing until it has
// something to show, so it never adds empty space to the dialog.
export default function MeetWeather({ lat, lng, startsAt }) {
  const [wx, setWx] = useState(null);

  useEffect(() => {
    let active = true;
    setWx(null);
    fetchMeetWeather(lat, lng, startsAt)
      .then((w) => { if (active) setWx(w); })
      .catch(() => {});
    return () => { active = false; };
  }, [lat, lng, startsAt]);

  if (!wx) return null;
  if (wx.past) return null;
  if (wx.tooFar) {
    return <p className="md-wx md-wx-soon">🌡 Vejrudsigt vises tættere på dagen</p>;
  }

  return (
    <div className="md-wx">
      <span className="md-wx-emoji">{wx.emoji}</span>
      <span className="md-wx-main">
        {wx.temp != null && <b>{wx.temp}°</b>}
        <span>{wx.label}</span>
      </span>
      <span className="md-wx-meta">
        {wx.wind != null && <span title="Vind">💨 {wx.wind} m/s</span>}
        {wx.precip != null && wx.precip > 0 && <span title="Nedbør">💧 {wx.precip} mm</span>}
      </span>
      <span className="md-wx-src">yr.no</span>
    </div>
  );
}
