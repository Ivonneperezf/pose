"use client";

import { ALL_POSES } from "../lib/poses";
import type { PoseDefinition } from "../lib/poses/types";

interface Props {
  onSelect: (pose: PoseDefinition) => void;
  onStartRoutine: (poses: PoseDefinition[]) => void;
}

export default function PoseSelector({ onSelect, onStartRoutine }: Props) {
  return (
    <div style={{ padding: "40px", background: "#080808", minHeight: "100vh", color: "#fff", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: "50px" }}>
        <h1 style={{ fontSize: "3rem", color: "#00d26e", marginBottom: "10px" }}>POSE AI</h1>
        <p style={{ color: "#666" }}>Selecciona una pose individual o inicia la rutina completa</p>
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
        gap: "25px", 
        maxWidth: "1200px", 
        margin: "0 auto" 
      }}>
        
        {/* TARJETA ESPECIAL: RUTINA COMPLETA */}
        <div 
          onClick={() => onStartRoutine?.(ALL_POSES)}
          style={{
            background: "linear-gradient(145deg, #00d26e, #009a50)",
            padding: "30px",
            borderRadius: "24px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.2s",
            boxShadow: "0 10px 30px rgba(0, 210, 110, 0.3)"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
          <span style={{ fontSize: "50px", marginBottom: "15px" }}>🚀</span>
          <h3 style={{ margin: 0, color: "#000", fontSize: "22px" }}>Rutina Completa</h3>
          <p style={{ color: "rgba(0,0,0,0.7)", textAlign: "center", fontSize: "14px" }}>
            Todas las poses en secuencia
          </p>
        </div>

        {/* MAPEO DE POSES INDIVIDUALES (Tu estética original) */}
        {ALL_POSES.map((pose) => (
          <div 
            key={pose.id}
            onClick={() => onSelect(pose)}
            style={{
              background: "#121212",
              border: "1px solid #222",
              padding: "30px",
              borderRadius: "24px",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#00d26e";
              e.currentTarget.style.background = "#181818";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#222";
              e.currentTarget.style.background = "#121212";
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "15px" }}>{pose.icon || "🧘"}</div>
            <h3 style={{ margin: "0 0 10px 0", color: "#fff" }}>{pose.name}</h3>
            <p style={{ margin: 0, color: "#666", fontSize: "14px", lineHeight: "1.4" }}>{pose.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}