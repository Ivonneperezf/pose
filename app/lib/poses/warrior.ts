import { PoseDefinition } from "./types";

// Pose Guerrero I simplificada: un brazo arriba, piernas separadas
export const warriorPose: PoseDefinition = {
  id: "warrior",
  name: "Guerrero I",
  description: "Brazos levantados, piernas en posición de estocada",
  globalMarginDeg: 20,
  keypoints: [
    // Codo izquierdo extendido arriba
    { landmark: 13, relativeTo: 11, anchor: 15, minAngle: 155, maxAngle: 180 },
    // Codo derecho extendido arriba
    { landmark: 14, relativeTo: 12, anchor: 16, minAngle: 155, maxAngle: 180 },
    // Rodilla izquierda doblada (~90°-120°): cadera-rodilla-tobillo
    { landmark: 25, relativeTo: 23, anchor: 27, minAngle: 80, maxAngle: 130 },
    // Rodilla derecha más extendida (pierna trasera)
    { landmark: 26, relativeTo: 24, anchor: 28, minAngle: 150, maxAngle: 180 },
  ],
};