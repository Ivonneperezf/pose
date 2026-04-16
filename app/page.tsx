"use client";

import { useState } from "react";
import PoseSelector from "./components/PoseSelector";
import PoseDetector from "./components/PoseDetector";
import RoutineManager from "./components/RoutineManager";
import type { PoseDefinition, RoutineDefinition } from "./lib/poses/types";

export default function Home() {
  const [selectedPose, setSelectedPose] = useState<PoseDefinition | null>(null);
  const [selectedRoutine, setSelectedRoutine] = useState<RoutineDefinition | null>(null);

  const handleBack = () => {
    setSelectedPose(null);
    setSelectedRoutine(null);
  };

  if (selectedRoutine) {
    return (
      <RoutineManager 
        routine={selectedRoutine} 
        onBack={handleBack} 
        onFinish={handleBack} 
      />
    );
  }

  if (selectedPose) {
    return <PoseDetector pose={selectedPose} onBack={handleBack} />;
  }

  return (
    <PoseSelector 
      onSelectPose={setSelectedPose} 
      onSelectRoutine={setSelectedRoutine} 
    />
  );
}