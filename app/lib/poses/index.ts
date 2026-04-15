import { tPose } from "./tPose";
import { warriorPose } from "./warrior";
import type { PoseDefinition } from "./types";

// Agrega aquí cualquier pose nueva — se refleja automáticamente en la UI
export const ALL_POSES: PoseDefinition[] = [
  tPose,
  warriorPose,
];

export { tPose, warriorPose };
export type { PoseDefinition, ValidationResult } from "./types";