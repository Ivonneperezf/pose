import { tPose } from "./tPose";
import { warriorPose } from "./warrior";
import type { PoseDefinition, RoutineDefinition } from "./types";

export const ALL_POSES: PoseDefinition[] = [
  tPose,
  warriorPose,
];

export const ALL_ROUTINES: RoutineDefinition[] = [
  {
    id: "rutina-basica",
    name: "Rutina de Estiramiento",
    description: "Secuencia completa: Pose en T seguida de Guerrero.",
    icon: "🔥",
    poses: [tPose, warriorPose]
  }
];

export { tPose, warriorPose };
export type { PoseDefinition, ValidationResult, RoutineDefinition } from "./types";