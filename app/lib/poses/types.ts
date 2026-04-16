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

// Extraemos esto para que sea más legible
export interface KeypointResult {
  landmark: number;
  passed: boolean;
  actual: number | null;
  expected: [number, number];
}

export interface ValidationResult {
  isValid: boolean;
  score: number;
  keypointResults: KeypointResult[];
  /** * Mensajes de retroalimentación detallados (ej: "Extiende más el codo")
   * que serán utilizados por el motor de voz y la UI.
   */
  messages?: string[]; 
}