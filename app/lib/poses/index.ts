import { POSES } from "./definitions";
import type { PoseDefinition } from "./types";

// ALL_POSES es lo que usa tu PoseSelector.tsx para mostrar las cards.
export const ALL_POSES: PoseDefinition[] = [
  POSES.T_POSE,
  POSES.ARMS_UP,
  POSES.RIGHT_ARM_UP
];

// Exportaciones individuales por si otros componentes las piden
export const tPose = POSES.T_POSE;
export const armsUp = POSES.ARMS_UP;
export const rightArmUp = POSES.RIGHT_ARM_UP;

export type { PoseDefinition, ValidationResult, LandmarkPoint } from "./types";