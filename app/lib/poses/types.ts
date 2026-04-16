export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PoseKeypoint {
  landmark: number;
  relativeTo?: number;
  anchor?: number;
  minAngle?: number;
  maxAngle?: number;
  xRange?: [number, number];
  yRange?: [number, number];
}

export interface PoseDefinition {
  id: string;
  name: string;
  description: string;
  icon?: string;
  keypoints: PoseKeypoint[];
  globalMarginDeg: number;
}

// Nueva interfaz para rutinas
export interface RoutineDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  poses: PoseDefinition[];
}

export interface ValidationResult {
  isValid: boolean;
  score: number;
  keypointResults: {
    landmark: number;
    passed: boolean;
    actual: number | null;
    expected: [number, number];
  }[];
}