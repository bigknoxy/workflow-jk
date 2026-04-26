import type { EvaluationCase } from "../schemas.js";

export { intakeCases } from "./intake-cases.js";
export { criticCases } from "./critic-cases.js";
export { architectCases } from "./architect-cases.js";
export { devCases } from "./dev-cases.js";
export { qaCases } from "./qa-cases.js";

import { intakeCases } from "./intake-cases.js";
import { criticCases } from "./critic-cases.js";
import { architectCases } from "./architect-cases.js";
import { devCases } from "./dev-cases.js";
import { qaCases } from "./qa-cases.js";

export const ALL_EVALUATION_CASES: EvaluationCase[] = [
  ...intakeCases,
  ...criticCases,
  ...architectCases,
  ...devCases,
  ...qaCases,
];