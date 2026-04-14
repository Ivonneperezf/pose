import { PoseDefinition } from "./types";

// Pose T: brazos extendidos horizontalmente
export const tPose: PoseDefinition = {
  id: "t-pose",
  name: "Pose T",
  description: "Brazos extendidos horizontalmente a los lados",
  globalMarginDeg: 15,
  keypoints: [
    // Codo izquierdo extendido (~180°): hombro-codo-muñeca
    { landmark: 13, relativeTo: 11, anchor: 15, minAngle: 160, maxAngle: 180 },
    // Codo derecho extendido (~180°): hombro-codo-muñeca
    { landmark: 14, relativeTo: 12, anchor: 16, minAngle: 160, maxAngle: 180 },
    // Hombro izquierdo abducido (~90°): cadera-hombro-codo
    { landmark: 11, relativeTo: 23, anchor: 13, minAngle: 75, maxAngle: 105 },
    // Hombro derecho abducido (~90°): cadera-hombro-codo
    { landmark: 12, relativeTo: 24, anchor: 14, minAngle: 75, maxAngle: 105 },
  ],
};