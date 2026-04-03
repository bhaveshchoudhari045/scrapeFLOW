// ── Single-condition descriptor ──────────────────────────────────────────────
export interface FilterCondition {
  /** The key to read from the item being evaluated (e.g. "price", "name"). */
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "starts_with"
    | "ends_with"
    | "greater_than"
    | "less_than"
    | "is_empty"
    | "is_not_empty";
  /** The comparison value (ignored for is_empty / is_not_empty). */
  value: string;
}

// ── Group of conditions with a logic operator ────────────────────────────────
export interface FilterConditionsConfig {
  /** How individual conditions are combined. */
  logicOperator: "AND" | "OR";
  conditions: FilterCondition[];
}

// ── Result returned by evaluateConditionsGroup ───────────────────────────────
export interface EvaluationResult {
  result: boolean;
  errors: string[];
}

// ── Core single-condition evaluator (also kept as default export) ─────────────
export default function evaluateCondition(
  data: any,
  operator: FilterCondition["operator"],
  value: string,
): boolean {
  const str = String(data ?? "").toLowerCase();
  const val = value.toLowerCase();

  switch (operator) {
    case "equals":
      return str === val;
    case "not_equals":
      return str !== val;
    case "contains":
      return str.includes(val);
    case "not_contains":
      return !str.includes(val);
    case "starts_with":
      return str.startsWith(val);
    case "ends_with":
      return str.endsWith(val);
    case "greater_than":
      return Number(data) > Number(value);
    case "less_than":
      return Number(data) < Number(value);
    case "is_empty":
      return data === undefined || data === null || data === "";
    case "is_not_empty":
      return data !== undefined && data !== null && data !== "";
    default:
      return false;
  }
}

/**
 * Evaluate a full FilterConditionsConfig against a single item.
 *
 * - Reads `condition.field` from the item (supports dot-notation: "a.b.c").
 * - Combines results with AND / OR as specified by `config.logicOperator`.
 * - Returns an `EvaluationResult` so callers can surface per-condition errors.
 *
 * @example
 * const { result, errors } = evaluateConditionsGroup(
 *   { price: 42, name: "Widget" },
 *   { logicOperator: "AND", conditions: [{ field: "price", operator: "greater_than", value: "10" }] }
 * );
 */
export function evaluateConditionsGroup(
  item: any,
  config: FilterConditionsConfig,
): EvaluationResult {
  const errors: string[] = [];
  const results: boolean[] = [];

  for (const condition of config.conditions) {
    // ── Dot-notation field access (e.g. "meta.score") ──
    const fieldValue = condition.field
      .split(".")
      .reduce((obj: any, key: string) => {
        if (obj === undefined || obj === null) return undefined;
        return obj[key];
      }, item);

    if (fieldValue === undefined) {
      errors.push(
        `Field "${condition.field}" not found on item — treating as empty`,
      );
    }

    results.push(
      evaluateCondition(fieldValue, condition.operator, condition.value),
    );
  }

  const result =
    config.logicOperator === "OR"
      ? results.some(Boolean)
      : results.every(Boolean);

  return { result, errors };
}
