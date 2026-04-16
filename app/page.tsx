"use client";

import { useState } from "react";
import PoseSelector from "./components/PoseSelector";
import PoseDetector from "./components/PoseDetector";
import type { PoseDefinition } from "./lib/poses";

export default function Home() {
  // Cambiamos el estado para que acepte un arreglo de poses
  const [activePoses, setActivePoses] = useState<PoseDefinition[] | null>(null);

  // Si no hay poses activas, mostramos el selector
  if (!activePoses) {
    return (
      <PoseSelector 
        // Cuando selecciona una sola, la envolvemos en un array [pose]
        onSelect={(pose) => setActivePoses([pose])} 
        // Cuando inicia rutina, pasamos el array ALL_POSES completo
        onStartRoutine={(poses) => setActivePoses(poses)} 
      />
    );
  }

  // Si hay poses, mostramos el detector pasándole el array
  return (
    <PoseDetector
      poses={activePoses}
      onBack={() => setActivePoses(null)}
    />
  );
}