"use client";

import { useState } from "react";
import PoseSelector from "./components/PoseSelector";
import PoseDetector from "./components/PoseDetector";
import type { PoseDefinition } from "./lib/poses";

export default function Home() {
  const [selectedPose, setSelectedPose] = useState<PoseDefinition | null>(null);

  if (!selectedPose) {
    return <PoseSelector onSelect={setSelectedPose} />;
  }

  return (
    <PoseDetector
      pose={selectedPose}
      onBack={() => setSelectedPose(null)}
    />
  );
}