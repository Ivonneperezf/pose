"use client";

import { ALL_POSES, ALL_ROUTINES } from "../lib/poses";
import type { PoseDefinition, RoutineDefinition } from "../lib/poses";

interface Props {
  onSelectPose: (pose: PoseDefinition) => void;
  onSelectRoutine: (routine: RoutineDefinition) => void;
}

export default function PoseSelector({ onSelectPose, onSelectRoutine }: Props) {
  return (
    <div style={{ width: "100vw", minHeight: "100vh", background: "#080808", padding: "40px 20px", fontFamily: "'Space Mono', monospace", color: "#fff" }}>
      
      {/* SECCIÓN RUTINAS */}
      <section style={{ maxWidth: 1000, margin: "0 auto 60px" }}>
        <h2 style={{ fontSize: 24, color: "#00d26e", marginBottom: 24 }}>⚡ RUTINAS COMPLETAS</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
          {ALL_ROUTINES.map((routine) => (
            <button key={routine.id} onClick={() => onSelectRoutine(routine)} style={cardStyle}>
              <div style={iconStyle}>{routine.icon}</div>
              <div>
                <div style={titleStyle}>{routine.name}</div>
                <div style={descStyle}>{routine.description}</div>
                <div style={{ color: "#00d26e", fontSize: 12, marginTop: 10 }}>{routine.poses.length} POSES EN CADENA</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* SECCIÓN POSES INDIVIDUALES */}
      <section style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ fontSize: 24, color: "#666", marginBottom: 24 }}>Individuales</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
          {ALL_POSES.map((pose) => (
            <button key={pose.id} onClick={() => onSelectPose(pose)} style={cardStyle}>
              <div style={iconStyle}>{pose.icon ?? "◈"}</div>
              <div>
                <div style={titleStyle}>{pose.name}</div>
                <div style={descStyle}>{pose.description}</div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

// Estilos rápidos para mantener consistencia
const cardStyle = { background: "#111", border: "2px solid #222", borderRadius: 24, padding: "30px", cursor: "pointer", textAlign: "left" as const, display: "flex", gap: 20, width: "100%" };
const iconStyle = { width: 50, height: 50, background: "rgba(0,210,110,0.1)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 };
const titleStyle = { fontSize: 20, fontWeight: 700, color: "#fff" };
const descStyle = { fontSize: 14, color: "#888", marginTop: 4 };