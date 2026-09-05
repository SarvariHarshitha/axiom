import { useState } from "react";
import type { NewsCard as NewsCardData } from "../api.js";

interface NewsCardProps {
  story: NewsCardData;
}

// Deterministic gradient per story so a missing image still gives each card
// a distinct identity instead of a flat placeholder.
const GRADIENTS = [
  "linear-gradient(135deg, #6366f1, #8b5cf6)",
  "linear-gradient(135deg, #0ea5e9, #6366f1)",
  "linear-gradient(135deg, #f43f5e, #8b5cf6)",
  "linear-gradient(135deg, #22c55e, #0ea5e9)",
  "linear-gradient(135deg, #eab308, #f43f5e)",
  "linear-gradient(135deg, #8b5cf6, #ec4899)"
];

function gradientFor(id: number): string {
  return GRADIENTS[id % GRADIENTS.length]!;
}

function timeAgo(unixSeconds: number): string {
  const diffMs = Date.now() - unixSeconds * 1000;
  const hours = diffMs / (1000 * 60 * 60);
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m ago`;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function NewsCard({ story }: NewsCardProps) {
  const [hovered, setHovered] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = story.hasImage && !imageFailed;

  return (
    <a
      href={story.url}
      target="_blank"
      rel="noreferrer"
      className="card fade-in"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        textDecoration: "none",
        color: "inherit",
        transition: "transform 0.15s ease, border-color 0.15s ease",
        transform: hovered ? "translateY(-2px)" : "none",
        borderColor: hovered ? "var(--border-strong)" : "var(--border)"
      }}
    >
      <div
        style={{
          height: 130,
          flexShrink: 0,
          background: showImage ? "var(--bg-3)" : gradientFor(story.id),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative"
        }}
      >
        {showImage ? (
          <img
            src={`/api/news/${story.id}/image`}
            alt=""
            onError={() => setImageFailed(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.85 }}>
            <path
              d="M12 2 3 7v10l9 5 9-5V7l-9-5Z"
              stroke="white"
              strokeWidth="1.4"
              strokeLinejoin="round"
              fill="none"
            />
            <path d="M12 2v20M3 7l9 5 9-5" stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        )}

        <span
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            fontSize: 10.5,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.55)",
            color: "white",
            backdropFilter: "blur(4px)"
          }}
        >
          {story.source}
        </span>
      </div>

      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <h3
          style={{
            margin: 0,
            fontSize: 13.5,
            fontWeight: 600,
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden"
          }}
        >
          {story.title}
        </h3>

        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 10, fontSize: 11.5, color: "var(--text-2)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="m12 4 2.5 5.5L20 10l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5L12 4Z" fill="var(--yellow)" />
            </svg>
            {story.score}
          </span>
          <span>{timeAgo(story.time)}</span>
        </div>
      </div>

      {/* Hover-reveal detail overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 14,
          background: "linear-gradient(to top, rgba(10,10,12,0.97) 40%, rgba(10,10,12,0.75) 75%, transparent)",
          opacity: hovered ? 1 : 0,
          pointerEvents: hovered ? "auto" : "none",
          transition: "opacity 0.15s ease"
        }}
      >
        <p
          style={{
            margin: "0 0 10px",
            fontSize: 12.5,
            lineHeight: 1.5,
            color: "var(--text-0)",
            fontWeight: 600
          }}
        >
          {story.title}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11.5, color: "var(--text-1)", marginBottom: 10 }}>
          <span>by {story.by}</span>
          <span>·</span>
          <span>{story.score} points</span>
          <span>·</span>
          <span>{story.descendants} comments</span>
          <span>·</span>
          <span>{timeAgo(story.time)}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="btn btn-primary btn-sm" style={{ pointerEvents: "none" }}>
            Open article ↗
          </span>
          <a
            href={story.hnUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="btn btn-ghost btn-sm"
            style={{ textDecoration: "none" }}
          >
            Discuss on HN
          </a>
        </div>
      </div>
    </a>
  );
}
