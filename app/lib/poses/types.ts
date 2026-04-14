export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

// Cada punto de referencia tiene un índice de MediaPipe (0-32)
// y un ángulo o posición esperada con tolerancia
export interface PoseKeypoint {
  landmark: number;        // índice MediaPipe
  relativeTo?: number;     // otro landmark para calcular ángulo
  anchor?: number;         // tercer punto para ángulo de articulación
  minAngle?: number;       // ángulo mínimo aceptable (grados)
  maxAngle?: number;       // ángulo máximo aceptable (grados)
  // Alternativamente, posición relativa normalizada
  xRange?: [number, number];
  yRange?: [number, number];
}

export interface PoseDefinition {
  id: string;
  name: string;
  description: string;
  keypoints: PoseKeypoint[];
  // Margen global de error en grados (además de min/max por punto)
  globalMarginDeg: number;
}

export interface ValidationResult {
  isValid: boolean;
  score: number;           // 0-1
  keypointResults: {
    landmark: number;
    passed: boolean;
    actual: number | null;
    expected: [number, number];
  }[];
}