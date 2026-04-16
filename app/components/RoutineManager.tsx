"use client";

import { useState, useCallback } from "react";
import PoseDetector from "./PoseDetector";
import type { RoutineDefinition } from "../lib/poses/types";

interface Props {
  routine: RoutineDefinition;
  onFinish: () => void;
  onBack: () => void;
}

export default function RoutineManager({ routine, onFinish, onBack }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentPose = routine.poses[currentIndex];

  // Esta función se llama desde PoseDetector cuando el contador llega a 0
  const handlePoseComplete = useCallback(() => {
    if (currentIndex < routine.poses.length - 1) {
      // Si hay más poses, avanzamos a la siguiente
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Si era la última, terminamos la rutina
      onFinish();
    }
  }, [currentIndex, routine.poses.length, onFinish]);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#000" }}>
      
      {/* Barra de progreso visual en la parte superior */}
      <div style={{ 
        position: "absolute", 
        top: 25, 
        left: "50%", 
        transform: "translateX(-50%)", 
        zIndex: 100, 
        display: "flex", 
        gap: "10px",
        background: "rgba(0,0,0,0.6)",
        padding: "12px 25px",
        borderRadius: "30px",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.1)"
      }}>
        {routine.poses.map((_, idx) => (
          <div key={idx} style={{ 
            width: "45px", 
            height: "8px", 
            borderRadius: "4px",
            // Verde si ya pasó, Blanco si es la actual, Gris si falta
            background: idx < currentIndex ? "#00d26e" : idx === currentIndex ? "#fff" : "#333",
            boxShadow: idx === currentIndex ? "0 0 15px rgba(255,255,255,0.5)" : "none",
            transition: "all 0.4s ease"
          }} />
        ))}
      </div>

      {/* CRÍTICO: La prop 'key' asegura que el componente se reinicie 
          completamente al cambiar de pose (ID diferente).
      */}
      <PoseDetector 
        key={currentPose.id} 
        pose={currentPose} 
        onBack={onBack} 
        onComplete={handlePoseComplete} 
      />

      {/* Indicador de texto opcional sobre el progreso */}
      <div style={{
        position: "absolute",
        bottom: 20,
        right: 30,
        color: "rgba(255,255,255,0.5)",
        fontSize: "14px",
        fontWeight: "bold",
        zIndex: 10
      }}>
        POSE {currentIndex + 1} DE {routine.poses.length}
      </div>
    </div>
  );
}