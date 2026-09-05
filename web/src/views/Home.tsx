import { useEffect, useState } from "react";
import { api, type NewsCard as NewsCardData } from "../api.js";
import { NewsCard } from "../news/NewsCard.js";

export function HomeView() {
  const [stories, setStories] = useState<NewsCardData[]>();
  const [error, setError] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);

  function load(showSpinner: boolean) {
    if (showSpinner) setRefreshing(true);
    api
      .news()
      .then((data) => {
        setStories(data);
        setError(undefined);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setRefreshing(false));
  }

  useEffect(() => {
    load(false);
  }, []);

  return (
    <div className="fade-in" style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 32px 80px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <div>
          <h1 style={{ fontSize: 22, margin: "0 0 4px", letterSpacing: "-0.01em" }}>AI news</h1>
          <p style={{ color: "var(--text-2)", margin: 0, fontSize: 13.5 }}>
            The 16 most-discussed AI stories on Hacker News right now. Hover a card for details.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => load(true)} disabled={refreshing}>
          {refreshing ? <span className="spinner" /> : null}
          Refresh
        </button>
      </div>

      {error && (
        <p style={{ color: "var(--red)", fontSize: 13, marginTop: 20 }}>
          Couldn't load news right now — {error}
        </p>
      )}

      {!stories && !error && (
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
          <span className="spinner" style={{ width: 24, height: 24 }} />
        </div>
      )}

      {stories && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
            marginTop: 24
          }}
        >
          {stories.map((story) => (
            <NewsCard key={story.id} story={story} />
          ))}
        </div>
      )}
    </div>
  );
}
