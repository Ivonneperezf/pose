"use client";

import { ALL_POSES } from "../lib/poses";
import type { PoseDefinition } from "../lib/poses";

// Emoji o ícono por pose (opcional, fallback a "◈")
const POSE_ICONS: Record<string, string> = {
  "t-pose": "T",
  "warrior": "⚔",
};

interface Props {
  onSelect: (pose: PoseDefinition) => void;
}

export default function PoseSelector({ onSelect }: Props) {
  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        background: "#0d0d0d",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily: "'Space Mono', 'Courier New', monospace",
        boxSizing: "border-box",
        gap: 32,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "3px",
            color: "#444",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Entrenamiento de poses
        </div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: "#eee",
            letterSpacing: 1,
            margin: 0,
          }}
        >
          Selecciona una pose
        </h1>
        <p style={{ color: "#555", fontSize: 12, marginTop: 8 }}>
          {ALL_POSES.length} poses disponibles
        </p>
      </div>

      {/* Grid de poses */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 14,
          width: "100%",
          maxWidth: 680,
        }}
      >
        {ALL_POSES.map((pose) => (
          <button
            key={pose.id}
            onClick={() => onSelect(pose)}
            style={{
              background: "#111",
              border: "1px solid #222",
              borderRadius: 16,
              padding: "22px 20px",
              cursor: "pointer",
              textAlign: "left",
              transition: "border-color 0.2s, background 0.2s",
              fontFamily: "inherit",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#00d26e55";
              (e.currentTarget as HTMLButtonElement).style.background = "#141414";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#222";
              (e.currentTarget as HTMLButtonElement).style.background = "#111";
            }}
          >
            {/* Ícono */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(0,210,110,0.08)",
                border: "1px solid rgba(0,210,110,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                color: "#00d26e",
                fontWeight: 700,
              }}
            >
              {POSE_ICONS[pose.id] ?? "◈"}
            </div>

            {/* Info */}
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#ddd",
                  marginBottom: 4,
                  letterSpacing: 0.5,
                }}
              >
                {pose.name}
              </div>
              <div style={{ fontSize: 11, color: "#555", lineHeight: 1.5 }}>
                {pose.description}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 4,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "#444",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                {pose.keypoints.length} puntos
              </span>
              <span style={{ color: "#00d26e", fontSize: 14 }}>→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}