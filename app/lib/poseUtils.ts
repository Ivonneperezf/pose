import { LandmarkPoint, PoseDefinition, ValidationResult } from "./poses/types";

export function angleBetween(a: LandmarkPoint, b: LandmarkPoint, c: LandmarkPoint): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let deg = Math.abs((radians * 180) / Math.PI);
  if (deg > 180) deg = 360 - deg;
  return deg;
}

function getJointName(index: number): string {
  const names: Record<number, string> = {
    11: "hombro izquierdo", 12: "hombro derecho",
    13: "codo izquierdo", 14: "codo derecho",
    15: "muñeca izquierda", 16: "muñeca derecha",
    23: "cadera izquierda", 24: "cadera derecha",
    25: "rodilla izquierda", 26: "rodilla derecha",
  };
  return names[index] || "la articulación";
}

export function validatePose(landmarks: LandmarkPoint[], pose: PoseDefinition): ValidationResult {
  const keypointResults: ValidationResult["keypointResults"] = [];
  const messages: string[] = [];
  let passedCount = 0;

  if (!pose.keypoints || pose.keypoints.length === 0) return { isValid: false, score: 0, keypointResults: [] };

  for (const kp of pose.keypoints) {
    const lm = landmarks[kp.landmark];
    if (!lm || (lm.visibility !== undefined && lm.visibility < 0.5)) continue;

    // VALIDACIÓN POR ÁNGULO
    if (kp.relativeTo !== undefined && kp.anchor !== undefined && kp.minAngle !== undefined && kp.maxAngle !== undefined) {
      const a = landmarks[kp.relativeTo];
      const c = landmarks[kp.anchor];
      if (!a || !c) continue;

      const angle = angleBetween(a, lm, c);
      // MARGEN MÁS SENSIBLE: Usamos 20 grados de tolerancia si no se especifica
      const margin = pose.globalMarginDeg || 20; 
      
      const isAngleOk = angle >= (kp.minAngle - margin) && angle <= (kp.maxAngle + margin);
      
      if (isAngleOk) {
        passedCount++;
      } else {
        const joint = getJointName(kp.landmark);
        // Indicaciones claras basadas en el ángulo
        if (angle < kp.minAngle - margin) messages.push(`Extiende más tu ${joint}`);
        else if (angle > kp.maxAngle + margin) messages.push(`Flexiona más tu ${joint}`);
      }
    } 
    // VALIDACIÓN POR POSICIÓN
    else if (kp.xRange || kp.yRange) {
      const xOk = kp.xRange ? (lm.x >= kp.xRange[0] && lm.x <= kp.xRange[1]) : true;
      const yOk = kp.yRange ? (lm.y >= kp.yRange[0] && lm.y <= kp.yRange[1]) : true;
      if (xOk && yOk) passedCount++;
      else messages.push(`Mueve tu ${getJointName(kp.landmark)} a la posición marcada`);
    }
  }

  const score = passedCount / pose.keypoints.length;
  return {
    // UMBRAL DE ÉXITO: 70% para no ser tan estricto
    isValid: score >= 0.7, 
    score,
    keypointResults,
    messages: messages.length > 0 ? [messages[0]] : [] // Solo enviamos la corrección más urgente
  };
}