import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import "./StudentHome.css";

export default function StudentHome() {
  // ✅ NEW: Lost & Found data for ticker
  const [lfItems, setLfItems] = useState([]);

  const loadLostFound = async () => {
    try {
      const res = await api.get("/lostfound");
      const list = res.data?.data || [];

      // latest first
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // ✅ show only LOST (optional). If you want LOST+FOUND, remove this filter.
      const onlyLost = list.filter(
        (x) => String(x.status || "lost").toLowerCase() === "lost"
      );

      setLfItems(onlyLost.slice(0, 10)); // show top 10
    } catch {
      setLfItems([]);
    }
  };

  useEffect(() => {
    loadLostFound();
  }, []);

  // ✅ NEW: create scrolling text messages
  const lostTicker = useMemo(() => {
    if (!lfItems.length) {
      return [
        "🔎 No LOST items reported now • If you find any item, return it to Admin Office •",
        "✅ Check Lost & Found page for latest updates •",
      ];
    }

    return lfItems.map((it) => {
      const title = String(it.title || "Item");
      const loc = String(it.location || "Unknown location");
      return `🚨 LOST: ${title} • Location: ${loc} • If found please return to Admin Office •`;
    });
  }, [lfItems]);

  // duplicate array for seamless animation
  const lostTrack = [...lostTicker, ...lostTicker];

  return (
    <div className="homeNoScroll">
      <section
        className="homeHeroFull"
        style={{
          backgroundImage:
            "linear-gradient(rgba(10,12,25,.55), rgba(10,12,25,.92)), url(/home-banner.jpg)",
        }}
      >

        {/* ✅ NEW: LOST & FOUND REPORTED ITEMS TICKER (added below) */}
        <div className="heroTicker heroTicker2">
          <div className="heroTickerTrack heroTickerTrack2">
            {lostTrack.map((t, idx) => (
              <span key={idx} className="heroTickerItem2">
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="homeHeroCenter">
          <h1 className="heroMainTitle">Welcome to</h1>
          <h2 className="heroBrand">EventVerse</h2>
          <p className="heroSubtitle">
            Discover, Create, and Participate in Amazing Events Across Campus
          </p>
        </div>
      </section>
    </div>
  );
}