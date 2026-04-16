import { PoseDefinition } from "./types";

export const POSES: Record<string, PoseDefinition> = {
  T_POSE: {
    id: "t-pose",
    name: "T-Pose",
    description: "Extiende tus brazos hacia los lados horizontalmente",
    icon: "🧘",
    globalMarginDeg: 10,
    keypoints: [
      { landmark: 11, relativeTo: 7, anchor: 13, minAngle: 75, maxAngle: 105 },
      { landmark: 12, relativeTo: 8, anchor: 14, minAngle: 75, maxAngle: 105 },
      { landmark: 13, relativeTo: 11, anchor: 15, minAngle: 160, maxAngle: 180 },
      { landmark: 14, relativeTo: 12, anchor: 16, minAngle: 160, maxAngle: 180 }
    ]
  },
  ARMS_UP: {
    id: "arms-up",
    name: "Brazos Arriba",
    description: "Eleva ambos brazos hacia el techo",
    icon: "🙌",
    globalMarginDeg: 15,
    keypoints: [
      { landmark: 11, relativeTo: 23, anchor: 13, minAngle: 150, maxAngle: 180 },
      { landmark: 12, relativeTo: 24, anchor: 14, minAngle: 150, maxAngle: 180 },
      { landmark: 13, relativeTo: 11, anchor: 15, minAngle: 150, maxAngle: 180 },
      { landmark: 14, relativeTo: 12, anchor: 16, minAngle: 150, maxAngle: 180 }
    ]
  },
  RIGHT_ARM_UP: {
    id: "right-arm-up",
    name: "Brazo Derecho Arriba",
    description: "Sube tu brazo derecho y mantén el izquierdo abajo",
    icon: "🙋",
    globalMarginDeg: 15,
    keypoints: [
      { landmark: 11, relativeTo: 23, anchor: 13, minAngle: 0, maxAngle: 40 },
      { landmark: 12, relativeTo: 24, anchor: 14, minAngle: 150, maxAngle: 180 },
      { landmark: 14, relativeTo: 12, anchor: 16, minAngle: 150, maxAngle: 180 }
    ]
  }
};