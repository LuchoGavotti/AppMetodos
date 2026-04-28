export interface BisectionRequest {
  function: string;
  a: number;
  b: number;
  tolerance: number;
  max_iterations: number;
  error_type: "absolute" | "relative";
}

export interface BisectionIteration {
  iteration: number;
  a: number;
  b: number;
  c: number;
  f_c: number;
  error: number;
}

export interface BisectionResponse {
  root: number;
  iterations: BisectionIteration[];
  converged: boolean;
  function: string;
  f_expr_latex: string;
  real_root_exact?: number;
  real_root_latex?: string;
}

export interface FixedPointRequest {
  g_function: string;
  x0: number;
  tolerance: number;
  max_iterations: number;
  error_type: "absolute" | "relative";
}

export interface FixedPointIteration {
  iteration: number;
  x_n: number;
  x_n1: number;
  g_xn: number;
  error: number;
}

export interface FixedPointResponse {
  root: number;
  iterations: FixedPointIteration[];
  converged: boolean;
  g_function: string;
  g_expr_latex: string;
  dg_expr_latex: string;
  dg_x0: number;
  convergence_warning?: string;
  real_root_exact?: number;
  real_root_latex?: string;
}

export interface AitkenRequest {
  g_function: string;
  x0: number;
  tolerance: number;
  max_iterations: number;
}

export interface AitkenIteration {
  iteration: number;
  x_n: number;
  x_n1: number;
  x_n2: number;
  x_accel: number;
  error: number;
}

export interface AitkenResponse {
  root: number;
  iterations: AitkenIteration[];
  converged: boolean;
  g_function: string;
  g_expr_latex: string;
  dg_expr_latex: string;
  dg_x0: number;
  convergence_warning?: string;
  real_root_exact?: number;
  real_root_latex?: string;
}

export interface NewtonRaphsonRequest {
  function: string;
  x0: number;
  tolerance: number;
  max_iterations: number;
}

export interface TangentLine {
  x_point: number;
  y_point: number;
  slope: number;
  x_intercept: number;
}

export interface NewtonRaphsonIteration {
  iteration: number;
  x_n: number;
  f_xn: number;
  df_xn: number;
  x_n1: number;
  error: number;
}

export interface NewtonRaphsonResponse {
  root: number;
  iterations: NewtonRaphsonIteration[];
  tangent_lines: TangentLine[];
  converged: boolean;
  function: string;
  f_expr_latex: string;
  df_expr_latex: string;
  real_root_exact?: number;
  real_root_latex?: string;
}

export interface InterpolationRequest {
  x_values: number[];
  y_values: number[];
  true_function?: string;
  error_point?: number;
}

export interface InterpolationPoint {
  x: number;
  y: number;
}

export interface BasisPolynomial {
  index: number;
  L_i: string;
  L_i_expr: string;
  L_i_expr_plot: string;
  L_i_latex_exact?: string;
  L_i_latex_numeric?: string;
  term_latex: string;
  term_expr: string;
  term_expr_plot: string;
  term_latex_exact?: string;
  term_latex_numeric?: string;
  point: InterpolationPoint;
}

export interface InterpolationCurve {
  index: number;
  points: InterpolationPoint[];
}

export interface InterpolationErrorAnalysis {
  true_function: string;
  true_function_latex: string;
  global_max_error?: number;
  global_max_error_at_x?: number;
  local_error?: {
    x: number;
    true_value: number;
    interp_value: number;
    abs_error: number;
  } | null;
}

export interface InterpolationResponse {
  polynomial: string;
  polynomial_termwise_exact?: string;
  polynomial_termwise_numeric?: string;
  polynomial_numeric?: string;
  polynomial_plot: string;
  polynomial_latex: string;
  polynomial_latex_exact?: string;
  polynomial_latex_numeric?: string;
  basis_polynomials: BasisPolynomial[];
  basis_curves: InterpolationCurve[];
  points: InterpolationPoint[];
  curve_points: InterpolationPoint[];
  degree: number;
  error_analysis?: InterpolationErrorAnalysis | null;
}

export interface DerivativeRequest {
  function?: string;
  x_values?: number[];
  y_values?: number[];
  x0: number;
  h: number;
  method: "forward" | "backward" | "central";
}

export interface DerivativeResponse {
  approximation: number;
  method: string;
  formula: string;
  formula_latex: string;
  h: number;
  x0: number;
  points_used: { x: number; y: number }[];
  exact_derivative?: number;
  error?: number;
  f_expr_latex?: string;
  df_expr_latex?: string;
}

export interface IntegrationRequest {
  function?: string;
  a: number;
  b: number;
  n: number;
  x_values?: number[];
  y_values?: number[];
  method:
    | "left_rectangle"
    | "right_rectangle"
    | "midpoint"
    | "trapezoidal"
    | "simpson_1_3"
    | "simpson_3_8";
}

export interface IntegrationShape {
  type: "rectangle" | "trapezoid" | "parabola" | "cubic";
  x1: number;
  x2: number;
  height?: number;
  y1?: number;
  y2?: number;
  points?: { x: number; y: number }[];
}

export interface IntegrationResponse {
  result: number;
  method: string;
  formula: string;
  formula_latex: string;
  n: number;
  h: number;
  a: number;
  b: number;
  shapes: IntegrationShape[];
  values_table: { x: number; y: number }[];
  exact_integral?: number;
  error?: number;
  truncation_error?: number;
  f_expr_latex?: string;
  source?: "function" | "table";
}

export interface MonteCarloRequest {
  function: string;
  method: "hit-or-miss" | "mean-value";
  dimension: 1 | 2 | 3;
  bounds: [number, number][];
  n: number;
  seed?: number;
  confidence_level: number;
  max_error?: number;
  max_points_to_return?: number;
}

export interface MonteCarloSamplePoint {
  x: number;
  y?: number;
  z?: number;
  value: number;
  aux?: number;
  accepted?: boolean | null;
}

export interface MonteCarloResponse {
  method: "hit-or-miss" | "mean-value";
  dimension: 1 | 2 | 3;
  function: string;
  function_latex: string;
  bounds: [number, number][];
  n_requested: number;
  n_used: number;
  seed?: number;
  domain_volume: number;
  estimate: number;
  sample_mean: number;
  sample_variance: number;
  sample_std_dev: number;
  standard_error: number;
  confidence_level: number;
  z_value: number;
  margin_of_error: number;
  confidence_interval_low: number;
  confidence_interval_high: number;
  max_error?: number;
  meets_max_error?: boolean;
  required_n_for_max_error?: number | null;
  exact_integral?: number;
  abs_error?: number;
  method_details?: {
    bounding_low?: number;
    bounding_high?: number;
    bounding_height?: number;
    accepted_points?: number;
    rejected_points?: number;
  };
  sample_points: MonteCarloSamplePoint[];
}

export interface AnalyticalSolverRequest {
  problem_type: "derivative" | "integral" | "differential-equation";
  function?: string;
  variable?: "x" | "y" | "z";
  derivative_order?: number;
  integral_dimension?: 1 | 2 | 3;
  bounds?: [number, number][];
  equation?: string;
  x0?: number;
  y0?: number;
}

export interface AnalyticalSolverStep {
  title: string;
  description: string;
  latex?: string | null;
}

export interface AnalyticalSolverResponse {
  available: boolean;
  problem_type: "derivative" | "integral" | "differential-equation";
  input_latex: string;
  result_latex?: string | null;
  message?: string | null;
  steps: AnalyticalSolverStep[];
  metadata?: {
    hint?: string | null;
    solved_with_ics?: boolean | null;
    satisfies_initial_condition?: boolean | null;
  } | null;
}

export interface DifferentialEquationRequest {
  equation: string;
  x0: number;
  y0: number;
  x_min: number;
  x_max: number;
  h: number;
  method: "euler" | "improved_euler" | "runge_kutta";
}

export interface DifferentialEquationPoint {
  x: number;
  y: number;
}

export interface DifferentialEquationIteration {
  iteration: number;
  direction: "forward" | "backward";
  x_i: number;
  y_i: number;
  x_next: number;
  y_next: number;
  h_step: number;
  slope: number;
  k1: number;
  k2: number | null;
  k3: number | null;
  k4: number | null;
}

export interface DifferentialEquationAnalyticStep {
  title: string;
  description: string;
  latex?: string | null;
}

export interface DifferentialEquationAnalyticSolution {
  available: boolean;
  hint?: string | null;
  solved_with_ics?: boolean;
  satisfies_initial_condition?: boolean | null;
  solution_latex: string;
  solution_expr_latex: string;
  steps: DifferentialEquationAnalyticStep[];
}

export interface DifferentialEquationResponse {
  equation: string;
  equation_latex: string;
  method: "euler" | "improved_euler" | "runge_kutta";
  x0: number;
  y0: number;
  x_min: number;
  x_max: number;
  h: number;
  points: DifferentialEquationPoint[];
  iterations: DifferentialEquationIteration[];
  analytic_solution?: DifferentialEquationAnalyticSolution | null;
}

export interface APIError {
  detail:
    | string
    | {
        error: string;
        message: string;
        suggestion?: string;
      };
}
