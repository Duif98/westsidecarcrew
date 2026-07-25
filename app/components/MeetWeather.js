"use client";

import { useEffect, useState } from "react";
import { fetchMeetWeather } from "../lib/weather";
import { useT } from "../lib/i18n";

// Weather forecast for a meet's start time. Renders nothing until it has
// something to show, so it never adds empty space to the dialog.
export default function MeetWeather({ lat, lng, startsAt }) {
  const { t } = useT();
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
    return <p className="md-wx md-wx-soon">🌡 {t("meet.wxSoon")}</p>;
  }

  return (
    <div className="md-wx">
      <span className="md-wx-emoji">{wx.emoji}</span>
      <span className="md-wx-main">
        {wx.temp != null && <b>{wx.temp}°</b>}
        <span>{t("weather." + (wx.labelKey || "unknown"))}</span>
      </span>
      <span className="md-wx-meta">
        {wx.wind != null && <span title={t("meet.wxWind")}>💨 {wx.wind} m/s</span>}
        {wx.precip != null && wx.precip > 0 && <span title={t("meet.wxPrecip")}>💧 {wx.precip} mm</span>}
      </span>
      <span className="md-wx-src">yr.no</span>
    </div>
  );
}
