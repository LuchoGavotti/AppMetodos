from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Literal
import sympy as sp
import numpy as np
import re

app = FastAPI(title="Numerical Methods API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class BisectionRequest(BaseModel):
    function: str = Field(..., description="Function string, e.g. 'x**3 - x - 2'")
    a: float = Field(..., description="Left endpoint")
    b: float = Field(..., description="Right endpoint")
    tolerance: float = Field(default=1e-6, description="Tolerance for convergence")
    max_iterations: int = Field(default=100, description="Maximum iterations")
    error_type: Literal["absolute", "relative"] = Field(default="absolute")

class FixedPointRequest(BaseModel):
    g_function: str = Field(..., description="Iteration function g(x)")
    x0: float = Field(..., description="Initial guess")
    tolerance: float = Field(default=1e-6)
    max_iterations: int = Field(default=100)
    error_type: Literal["absolute", "relative"] = Field(default="absolute")

class AitkenRequest(BaseModel):
    g_function: str = Field(..., description="Iteration function g(x)")
    x0: float = Field(..., description="Initial guess")
    tolerance: float = Field(default=1e-6)
    max_iterations: int = Field(default=100)

class NewtonRaphsonRequest(BaseModel):
    function: str = Field(..., description="Function f(x)")
    x0: float = Field(..., description="Initial guess")
    tolerance: float = Field(default=1e-6)
    max_iterations: int = Field(default=100)

class InterpolationRequest(BaseModel):
    x_values: list[float] = Field(..., description="X coordinates of points")
    y_values: list[float] = Field(..., description="Y coordinates of points")
    true_function: Optional[str] = Field(None, description="Optional real function for error analysis")
    error_point: Optional[float] = Field(None, description="Optional x value for local error")

class DerivativeRequest(BaseModel):
    function: Optional[str] = Field(None, description="Function string (if analytical)")
    x_values: Optional[list[float]] = Field(None, description="X values (if tabular)")
    y_values: Optional[list[float]] = Field(None, description="Y values (if tabular)")
    x0: float = Field(..., description="Point to evaluate derivative")
    h: float = Field(default=0.1, description="Step size")
    method: Literal["forward", "backward", "central"] = Field(default="central")

class IntegrationRequest(BaseModel):
    function: Optional[str] = Field(None, description="Function to integrate")
    a: float = Field(..., description="Lower bound")
    b: float = Field(..., description="Upper bound")
    n: int = Field(default=10, description="Number of subintervals")
    x_values: Optional[list[float]] = Field(None, description="Tabulated x values")
    y_values: Optional[list[float]] = Field(None, description="Tabulated y values")
    method: Literal["left_rectangle", "right_rectangle", "midpoint", "trapezoidal", "simpson_1_3", "simpson_3_8"] = Field(default="trapezoidal")


class MonteCarloRequest(BaseModel):
    function: str = Field(..., description="Function to integrate")
    method: Literal["hit-or-miss", "mean-value"] = Field(default="mean-value")
    dimension: Literal[1, 2, 3] = Field(default=1)
    bounds: list[list[float]] = Field(..., description="Bounds per dimension: [[min,max], ...]")
    n: int = Field(default=10000, ge=100, le=1_000_000)
    seed: Optional[int] = Field(default=None)
    max_points_to_return: int = Field(default=2000, ge=100, le=10000)


def parse_function(func_str: str):
    """Parse a string function into a sympy expression."""
    x = sp.Symbol('x')
    try:
        normalized = normalize_function_aliases(func_str)
        expr = sp.sympify(normalized)
        return expr, x
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid function: {str(e)}")


def normalize_function_aliases(func_str: str) -> str:
    """Allow common Spanish aliases for function names."""
    normalized = func_str
    replacements = {
        r"\bsen\s*\(": "sin(",
        r"\btg\s*\(": "tan(",
        r"\braiz\s*\(": "sqrt(",
    }

    for pattern, replacement in replacements.items():
        normalized = re.sub(pattern, replacement, normalized, flags=re.IGNORECASE)

    return normalized


def evaluate_func(expr, x_sym, x_val: float) -> float:
    """Evaluate a sympy expression at a given x value."""
    try:
        result = float(expr.subs(x_sym, x_val).evalf())
        if np.isnan(result) or np.isinf(result):
            raise ValueError("Function evaluation resulted in NaN or Inf")
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot evaluate function at x={x_val}: {str(e)}")


def make_rng(seed: Optional[int]) -> np.random.Generator:
    """Return a deterministic RNG when seed is provided."""
    return np.random.default_rng(seed)


def parse_multivariate_function(func_str: str, dimension: int):
    """Parse and compile a multivariate function with variables x, y, z."""
    symbols = sp.symbols("x y z")[:dimension]
    allowed = set(symbols)

    try:
        normalized = normalize_function_aliases(func_str)
        expr = sp.sympify(normalized)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid function: {str(e)}")

    unknown_symbols = expr.free_symbols - allowed
    if unknown_symbols:
        unknown = ", ".join(sorted(str(s) for s in unknown_symbols))
        raise HTTPException(
            status_code=400,
            detail=f"Function contains invalid symbols for {dimension}D: {unknown}. Use only x, y, z."
        )

    try:
        fn = sp.lambdify(symbols, expr, modules=["numpy"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot compile function: {str(e)}")

    return expr, symbols, fn


def normalize_bounds(bounds: list[list[float]], dimension: int) -> np.ndarray:
    """Validate bounds and return ndarray shape (dimension, 2)."""
    if len(bounds) != dimension:
        raise HTTPException(
            status_code=400,
            detail=f"Bounds size mismatch: expected {dimension} intervals, got {len(bounds)}"
        )

    normalized = []
    for i, interval in enumerate(bounds):
        if len(interval) != 2:
            raise HTTPException(status_code=400, detail=f"Bounds[{i}] must have exactly 2 values")

        low = float(interval[0])
        high = float(interval[1])
        if not np.isfinite(low) or not np.isfinite(high):
            raise HTTPException(status_code=400, detail=f"Bounds[{i}] must be finite numbers")
        if high <= low:
            raise HTTPException(status_code=400, detail=f"Bounds[{i}] invalid: upper must be greater than lower")

        normalized.append([low, high])

    return np.array(normalized, dtype=float)


def compute_box_volume(bounds_array: np.ndarray) -> float:
    lengths = bounds_array[:, 1] - bounds_array[:, 0]
    return float(np.prod(lengths))


def sample_points_in_domain(rng: np.random.Generator, bounds_array: np.ndarray, n: int) -> np.ndarray:
    lows = bounds_array[:, 0]
    highs = bounds_array[:, 1]
    return rng.uniform(lows, highs, size=(n, bounds_array.shape[0]))


def evaluate_function_batch(compiled_fn, points: np.ndarray) -> np.ndarray:
    args = [points[:, i] for i in range(points.shape[1])]
    values = compiled_fn(*args)
    values = np.asarray(values, dtype=float)

    if values.ndim == 0:
        values = np.full(points.shape[0], float(values), dtype=float)
    if values.shape[0] != points.shape[0]:
        values = np.reshape(values, (points.shape[0],))

    return values


def estimate_function_range(compiled_fn, bounds_array: np.ndarray, rng: np.random.Generator, pilot_n: int = 2500):
    """Estimate robust min/max function values in the domain for hit-or-miss."""
    dim = bounds_array.shape[0]
    pilot_points = sample_points_in_domain(rng, bounds_array, pilot_n)

    # Include all corners to better catch boundary extremes.
    corner_axes = [bounds_array[i, :] for i in range(dim)]
    corners = np.array(np.meshgrid(*corner_axes)).T.reshape(-1, dim)
    probe_points = np.vstack([pilot_points, corners])

    values = evaluate_function_batch(compiled_fn, probe_points)
    finite = np.isfinite(values)
    values = values[finite]

    if values.size == 0:
        raise HTTPException(status_code=400, detail="Function returned no finite values in the integration domain")

    v_min = float(np.min(values))
    v_max = float(np.max(values))

    spread = max(v_max - v_min, 1e-8)
    padding = 0.05 * spread
    v_min -= padding
    v_max += padding

    # Ensure 0 is included to support signed integrands.
    v_min = min(v_min, 0.0)
    v_max = max(v_max, 0.0)

    return v_min, v_max


def maybe_exact_integral(expr, symbols, bounds_array: np.ndarray):
    """Try symbolic exact integral when feasible (mainly 1D, sometimes 2D/3D)."""
    try:
        integral_expr = expr
        for i, sym in enumerate(symbols):
            low, high = bounds_array[i]
            integral_expr = sp.integrate(integral_expr, (sym, low, high))

        exact_val = float(integral_expr.evalf())
        if np.isfinite(exact_val):
            return exact_val
    except Exception:
        return None
    return None


@app.get("/health")
async def health():
    return {"status": "ok", "service": "numerical-methods"}


@app.post("/bisection")
async def bisection(req: BisectionRequest):
    """Bisection method for root finding."""
    expr, x = parse_function(req.function)
    
    a, b = req.a, req.b
    fa = evaluate_func(expr, x, a)
    fb = evaluate_func(expr, x, b)
    
    # Bolzano check
    if fa * fb >= 0:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Bolzano theorem not satisfied",
                "message": f"f(a) = {fa:.6f} and f(b) = {fb:.6f} must have opposite signs",
                "suggestion": "Adjust interval [a, b] so f(a) and f(b) have different signs"
            }
        )
    
    iterations = []
    for i in range(req.max_iterations):
        c = (a + b) / 2.0
        fc = evaluate_func(expr, x, c)
        
        error = abs(b - a) / 2.0 if req.error_type == "absolute" else abs((b - a) / (2.0 * c)) if c != 0 else float('inf')
        
        iterations.append({
            "iteration": i + 1,
            "a": round(a, 10),
            "b": round(b, 10),
            "c": round(c, 10),
            "f_c": round(fc, 10),
            "error": round(error, 10)
        })
        
        if abs(fc) < req.tolerance or error < req.tolerance:
            return {
                "root": round(c, 10),
                "iterations": iterations,
                "converged": True,
                "function": req.function,
                "f_expr_latex": sp.latex(expr)
            }
        
        if fa * fc < 0:
            b = c
            fb = fc
        else:
            a = c
            fa = fc
    
    return {
        "root": round((a + b) / 2.0, 10),
        "iterations": iterations,
        "converged": False,
        "function": req.function,
        "f_expr_latex": sp.latex(expr)
    }


@app.post("/fixed-point")
async def fixed_point(req: FixedPointRequest):
    """Fixed point iteration method."""
    g_expr, x = parse_function(req.g_function)
    dg_expr = sp.diff(g_expr, x)
    
    # Check convergence condition at x0
    dg_x0 = abs(float(dg_expr.subs(x, req.x0).evalf()))
    convergence_warning = None
    if dg_x0 >= 1:
        convergence_warning = f"|g'(x0)| = {dg_x0:.6f} >= 1. Method may not converge."
    
    x_curr = req.x0
    iterations = []
    
    for i in range(req.max_iterations):
        x_next = evaluate_func(g_expr, x, x_curr)
        
        if req.error_type == "absolute":
            error = abs(x_next - x_curr)
        else:
            error = abs((x_next - x_curr) / x_next) if x_next != 0 else float('inf')
        
        iterations.append({
            "iteration": i + 1,
            "x_n": round(x_curr, 10),
            "x_n1": round(x_next, 10),
            "g_xn": round(x_next, 10),
            "error": round(error, 10)
        })
        
        if error < req.tolerance:
            return {
                "root": round(x_next, 10),
                "iterations": iterations,
                "converged": True,
                "g_function": req.g_function,
                "g_expr_latex": sp.latex(g_expr),
                "dg_expr_latex": sp.latex(dg_expr),
                "dg_x0": round(dg_x0, 10),
                "convergence_warning": convergence_warning
            }
        
        x_curr = x_next
    
    return {
        "root": round(x_curr, 10),
        "iterations": iterations,
        "converged": False,
        "g_function": req.g_function,
        "g_expr_latex": sp.latex(g_expr),
        "dg_expr_latex": sp.latex(dg_expr),
        "dg_x0": round(dg_x0, 10),
        "convergence_warning": convergence_warning
    }


@app.post("/aitken")
async def aitken(req: AitkenRequest):
    """Aitken's acceleration method."""
    g_expr, x = parse_function(req.g_function)
    dg_expr = sp.diff(g_expr, x)
    
    x0 = req.x0
    iterations = []
    
    for i in range(req.max_iterations):
        x1 = evaluate_func(g_expr, x, x0)
        x2 = evaluate_func(g_expr, x, x1)
        
        denominator = x2 - 2*x1 + x0
        if abs(denominator) < 1e-15:
            raise HTTPException(
                status_code=400,
                detail="Aitken acceleration failed: denominator too small"
            )
        
        x_accel = x0 - (x1 - x0)**2 / denominator
        error = abs((x_accel - x0) / x_accel) if x_accel != 0 else float('inf')
        
        iterations.append({
            "iteration": i + 1,
            "x_n": round(x0, 10),
            "x_n1": round(x1, 10),
            "x_n2": round(x2, 10),
            "x_accel": round(x_accel, 10),
            "error": round(error, 10)
        })
        
        if error < req.tolerance:
            return {
                "root": round(x_accel, 10),
                "iterations": iterations,
                "converged": True,
                "g_function": req.g_function,
                "g_expr_latex": sp.latex(g_expr),
                "dg_expr_latex": sp.latex(dg_expr)
            }
        
        x0 = x_accel
    
    return {
        "root": round(x0, 10),
        "iterations": iterations,
        "converged": False,
        "g_function": req.g_function,
        "g_expr_latex": sp.latex(g_expr),
        "dg_expr_latex": sp.latex(dg_expr)
    }


@app.post("/newton-raphson")
async def newton_raphson(req: NewtonRaphsonRequest):
    """Newton-Raphson method for root finding."""
    f_expr, x = parse_function(req.function)
    df_expr = sp.diff(f_expr, x)
    
    x_curr = req.x0
    iterations = []
    tangent_lines = []  # For graphing
    
    for i in range(req.max_iterations):
        f_val = evaluate_func(f_expr, x, x_curr)
        df_val = evaluate_func(df_expr, x, x_curr)
        
        if abs(df_val) < 1e-15:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Derivative is zero",
                    "message": f"f'({x_curr}) = 0. Cannot continue iteration.",
                    "suggestion": "Try a different initial guess"
                }
            )
        
        x_next = x_curr - f_val / df_val
        error = abs(x_next - x_curr)
        
        # Store tangent line data for visualization
        tangent_lines.append({
            "x_point": round(x_curr, 10),
            "y_point": round(f_val, 10),
            "slope": round(df_val, 10),
            "x_intercept": round(x_next, 10)
        })
        
        iterations.append({
            "iteration": i + 1,
            "x_n": round(x_curr, 10),
            "f_xn": round(f_val, 10),
            "df_xn": round(df_val, 10),
            "x_n1": round(x_next, 10),
            "error": round(error, 10)
        })
        
        if error < req.tolerance:
            return {
                "root": round(x_next, 10),
                "iterations": iterations,
                "tangent_lines": tangent_lines,
                "converged": True,
                "function": req.function,
                "f_expr_latex": sp.latex(f_expr),
                "df_expr_latex": sp.latex(df_expr)
            }
        
        x_curr = x_next
    
    return {
        "root": round(x_curr, 10),
        "iterations": iterations,
        "tangent_lines": tangent_lines,
        "converged": False,
        "function": req.function,
        "f_expr_latex": sp.latex(f_expr),
        "df_expr_latex": sp.latex(df_expr)
    }


@app.post("/interpolation")
async def lagrange_interpolation(req: InterpolationRequest):
    """Lagrange polynomial interpolation."""
    if len(req.x_values) != len(req.y_values):
        raise HTTPException(status_code=400, detail="x_values and y_values must have same length")
    
    if len(req.x_values) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 points for interpolation")

    if len(set(req.x_values)) != len(req.x_values):
        raise HTTPException(status_code=400, detail="x_values cannot contain duplicates")
    
    n = len(req.x_values)
    x = sp.Symbol('x')

    def simplify_expr(expr):
        # Canonical simplification pipeline for stable display in UI.
        return sp.simplify(sp.cancel(sp.together(expr)))

    # Keep points ordered by x for stable display and plotting.
    points_xy = sorted(zip(req.x_values, req.y_values), key=lambda p: p[0])
    x_sorted = [float(p[0]) for p in points_xy]
    y_sorted = [float(p[1]) for p in points_xy]
    
    # Build Lagrange polynomial
    polynomial = 0
    basis_polynomials = []
    
    for i in range(n):
        Li = 1
        for j in range(n):
            if i != j:
                Li *= (x - x_sorted[j]) / (x_sorted[i] - x_sorted[j])
        
        Li_simplified = simplify_expr(Li)
        weighted_term = simplify_expr(y_sorted[i] * Li_simplified)
        basis_polynomials.append({
            "index": i,
            "L_i": sp.latex(Li_simplified),
            "L_i_expr": str(Li_simplified),
            "L_i_expr_plot": str(Li_simplified).replace("**", "^"),
            "term_latex": sp.latex(weighted_term),
            "term_expr": str(weighted_term),
            "term_expr_plot": str(weighted_term).replace("**", "^"),
            "point": {"x": x_sorted[i], "y": y_sorted[i]}
        })
        
        polynomial += y_sorted[i] * Li
    
    polynomial = sp.expand(polynomial)
    polynomial_simplified = simplify_expr(polynomial)
    
    # Generate points for graphing
    x_min, x_max = min(x_sorted), max(x_sorted)
    margin = (x_max - x_min) * 0.1
    x_range = np.linspace(x_min - margin, x_max + margin, 100)

    poly_fn = sp.lambdify(x, polynomial_simplified, modules=["numpy"])
    
    curve_points = []
    for xi in x_range:
        try:
            yi = float(poly_fn(float(xi)))
            if not np.isnan(yi) and not np.isinf(yi):
                curve_points.append({"x": round(float(xi), 6), "y": round(yi, 6)})
        except:
            pass

    basis_curves = []
    for basis in basis_polynomials:
        expr = sp.sympify(basis["L_i_expr"])
        basis_fn = sp.lambdify(x, expr, modules=["numpy"])
        points = []
        for xi in x_range:
            try:
                yi = float(basis_fn(float(xi)))
                if np.isfinite(yi):
                    points.append({"x": round(float(xi), 6), "y": round(yi, 6)})
            except Exception:
                continue
        basis_curves.append({
            "index": basis["index"],
            "points": points
        })

    error_analysis = None
    if req.true_function:
        true_expr, true_x = parse_function(req.true_function)
        true_fn = sp.lambdify(true_x, true_expr, modules=["numpy"])

        grid_x = np.linspace(x_min, x_max, 400)
        local_errors = []
        for xi in grid_x:
            try:
                true_y = float(true_fn(float(xi)))
                poly_y = float(poly_fn(float(xi)))
                if np.isfinite(true_y) and np.isfinite(poly_y):
                    local_errors.append((float(xi), abs(true_y - poly_y)))
            except Exception:
                continue

        global_max_error = None
        at_x = None
        if local_errors:
            at_x, global_max_error = max(local_errors, key=lambda t: t[1])

        point_error = None
        if req.error_point is not None:
            try:
                xe = float(req.error_point)
                true_y = float(true_fn(xe))
                poly_y = float(poly_fn(xe))
                if np.isfinite(true_y) and np.isfinite(poly_y):
                    point_error = {
                        "x": round(xe, 10),
                        "true_value": round(true_y, 10),
                        "interp_value": round(poly_y, 10),
                        "abs_error": round(abs(true_y - poly_y), 10),
                    }
            except Exception:
                point_error = None

        error_analysis = {
            "true_function": req.true_function,
            "true_function_latex": sp.latex(true_expr),
            "global_max_error": round(global_max_error, 10) if global_max_error is not None else None,
            "global_max_error_at_x": round(at_x, 10) if at_x is not None else None,
            "local_error": point_error,
        }
    
    return {
        "polynomial": str(polynomial_simplified),
        "polynomial_plot": str(polynomial_simplified).replace("**", "^"),
        "polynomial_latex": sp.latex(polynomial_simplified),
        "basis_polynomials": basis_polynomials,
        "basis_curves": basis_curves,
        "points": [{"x": xi, "y": yi} for xi, yi in zip(x_sorted, y_sorted)],
        "curve_points": curve_points,
        "degree": n - 1,
        "error_analysis": error_analysis
    }


@app.post("/derivative")
async def numerical_derivative(req: DerivativeRequest):
    """Numerical derivative approximation."""
    x = sp.Symbol('x')
    
    if req.function:
        # Analytical function provided
        f_expr, x = parse_function(req.function)
        df_expr = sp.diff(f_expr, x)
        exact_derivative = float(df_expr.subs(x, req.x0).evalf())
        
        def f(val):
            return evaluate_func(f_expr, x, val)
    elif req.x_values and req.y_values:
        # Tabular data
        exact_derivative = None
        f_expr = None
        df_expr = None
        
        # Create interpolation function
        from scipy import interpolate
        f = interpolate.interp1d(req.x_values, req.y_values, kind='cubic', fill_value='extrapolate')
    else:
        raise HTTPException(status_code=400, detail="Provide either function or (x_values, y_values)")
    
    h = req.h
    x0 = req.x0
    
    if req.method == "forward":
        # Forward difference: f'(x) ≈ [f(x+h) - f(x)] / h
        approx = (f(x0 + h) - f(x0)) / h
        formula = "f'(x) ≈ [f(x+h) - f(x)] / h"
        formula_latex = r"f'(x) \approx \frac{f(x+h) - f(x)}{h}"
        points_used = [{"x": x0, "y": f(x0)}, {"x": x0 + h, "y": f(x0 + h)}]
    elif req.method == "backward":
        # Backward difference: f'(x) ≈ [f(x) - f(x-h)] / h
        approx = (f(x0) - f(x0 - h)) / h
        formula = "f'(x) ≈ [f(x) - f(x-h)] / h"
        formula_latex = r"f'(x) \approx \frac{f(x) - f(x-h)}{h}"
        points_used = [{"x": x0 - h, "y": f(x0 - h)}, {"x": x0, "y": f(x0)}]
    else:  # central
        # Central difference: f'(x) ≈ [f(x+h) - f(x-h)] / (2h)
        approx = (f(x0 + h) - f(x0 - h)) / (2 * h)
        formula = "f'(x) ≈ [f(x+h) - f(x-h)] / (2h)"
        formula_latex = r"f'(x) \approx \frac{f(x+h) - f(x-h)}{2h}"
        points_used = [{"x": x0 - h, "y": f(x0 - h)}, {"x": x0 + h, "y": f(x0 + h)}]
    
    result = {
        "approximation": round(float(approx), 10),
        "method": req.method,
        "formula": formula,
        "formula_latex": formula_latex,
        "h": h,
        "x0": x0,
        "points_used": points_used
    }
    
    if exact_derivative is not None:
        result["exact_derivative"] = round(exact_derivative, 10)
        result["error"] = round(abs(exact_derivative - approx), 10)
        result["f_expr_latex"] = sp.latex(f_expr)
        result["df_expr_latex"] = sp.latex(df_expr)
    
    return result


@app.post("/integration")
async def numerical_integration(req: IntegrationRequest):
    """Numerical integration methods."""
    x = sp.Symbol('x')

    a, b = req.a, req.b
    n = req.n
    if n <= 0:
        raise HTTPException(status_code=400, detail="n must be a positive integer")
    if b <= a:
        raise HTTPException(status_code=400, detail="Invalid interval: b must be greater than a")

    h = (b - a) / n

    f_expr = None
    from_table = req.x_values is not None and req.y_values is not None

    if req.function:
        f_expr, x = parse_function(req.function)

        def f_raw(val):
            return evaluate_func(f_expr, x, val)
    elif from_table:
        if len(req.x_values) != len(req.y_values):
            raise HTTPException(status_code=400, detail="x_values and y_values must have same length")
        if len(req.x_values) < 2:
            raise HTTPException(status_code=400, detail="Need at least 2 tabulated points")
        points = sorted(zip(req.x_values, req.y_values), key=lambda p: p[0])
        x_table = [float(p[0]) for p in points]
        y_table = [float(p[1]) for p in points]

        if x_table[0] > a or x_table[-1] < b:
            raise HTTPException(
                status_code=400,
                detail="Tabulated data must cover the full interval [a, b]"
            )
        if any(x_table[i] == x_table[i + 1] for i in range(len(x_table) - 1)):
            raise HTTPException(status_code=400, detail="x_values cannot contain duplicates")

        def f_raw(val):
            return float(np.interp(val, x_table, y_table))
    else:
        raise HTTPException(
            status_code=400,
            detail="Provide either 'function' or both 'x_values' and 'y_values'"
        )

    # For analytical functions, handle undefined endpoints using one-sided limits.
    def safe_boundary_eval(val: float, direction: str):
        if from_table:
            return f_raw(val)
        try:
            return f_raw(val)
        except HTTPException:
            try:
                lim = sp.limit(f_expr, x, val, dir=direction)
                lim_f = float(lim.evalf())
                if np.isnan(lim_f) or np.isinf(lim_f):
                    raise ValueError("Limit produced invalid value")
                return lim_f
            except Exception:
                side = "right" if direction == "+" else "left"
                raise HTTPException(
                    status_code=400,
                    detail=f"f(x) is undefined at boundary x={val} and {side}-hand limit could not be computed"
                )

    def f(val: float):
        if np.isclose(val, a):
            return safe_boundary_eval(val, "+")
        if np.isclose(val, b):
            return safe_boundary_eval(val, "-")
        return f_raw(val)
    
    # Validate n for Simpson methods
    if req.method == "simpson_1_3" and n % 2 != 0:
        raise HTTPException(
            status_code=400,
            detail="Simpson 1/3 requires even number of subintervals (n must be even)"
        )
    if req.method == "simpson_3_8" and n % 3 != 0:
        raise HTTPException(
            status_code=400,
            detail="Simpson 3/8 requires n to be a multiple of 3"
        )
    
    shapes = []  # For visualization
    x_points = np.linspace(a, b, n + 1)
    y_points = [f(xi) for xi in x_points]
    
    if req.method == "left_rectangle":
        result = sum(f(a + i*h) for i in range(n)) * h
        formula = "∫f(x)dx ≈ h·Σf(x_i)"
        formula_latex = r"\int f(x)dx \approx h \sum_{i=0}^{n-1} f(x_i)"
        for i in range(n):
            xi = a + i*h
            shapes.append({
                "type": "rectangle",
                "x1": xi, "x2": xi + h,
                "height": f(xi)
            })
    
    elif req.method == "right_rectangle":
        result = sum(f(a + (i+1)*h) for i in range(n)) * h
        formula = "∫f(x)dx ≈ h·Σf(x_{i+1})"
        formula_latex = r"\int f(x)dx \approx h \sum_{i=0}^{n-1} f(x_{i+1})"
        for i in range(n):
            xi = a + i*h
            shapes.append({
                "type": "rectangle",
                "x1": xi, "x2": xi + h,
                "height": f(xi + h)
            })
    
    elif req.method == "midpoint":
        result = sum(f(a + (i+0.5)*h) for i in range(n)) * h
        formula = "∫f(x)dx ≈ h·Σf(x_{i+1/2})"
        formula_latex = r"\int f(x)dx \approx h \sum_{i=0}^{n-1} f(x_{i+1/2})"
        for i in range(n):
            xi = a + i*h
            mid = xi + h/2
            shapes.append({
                "type": "rectangle",
                "x1": xi, "x2": xi + h,
                "height": f(mid)
            })
    
    elif req.method == "trapezoidal":
        result = (f(a) + f(b) + 2*sum(f(a + i*h) for i in range(1, n))) * h / 2
        formula = "∫f(x)dx ≈ (h/2)·[f(a) + 2·Σf(x_i) + f(b)]"
        formula_latex = r"\int f(x)dx \approx \frac{h}{2}\left[f(a) + 2\sum_{i=1}^{n-1} f(x_i) + f(b)\right]"
        for i in range(n):
            xi = a + i*h
            shapes.append({
                "type": "trapezoid",
                "x1": xi, "x2": xi + h,
                "y1": f(xi), "y2": f(xi + h)
            })
    
    elif req.method == "simpson_1_3":
        result = 0
        for i in range(0, n, 2):
            x0_i = a + i*h
            x1_i = x0_i + h
            x2_i = x0_i + 2*h
            result += f(x0_i) + 4*f(x1_i) + f(x2_i)
        result *= h / 3
        formula = "∫f(x)dx ≈ (h/3)·Σ[f(x_{2i}) + 4f(x_{2i+1}) + f(x_{2i+2})]"
        formula_latex = r"\int f(x)dx \approx \frac{h}{3}\sum_{i=0}^{n/2-1}\left[f(x_{2i}) + 4f(x_{2i+1}) + f(x_{2i+2})\right]"
        for i in range(0, n, 2):
            xi = a + i*h
            shapes.append({
                "type": "parabola",
                "x1": xi, "x2": xi + 2*h,
                "points": [
                    {"x": xi, "y": f(xi)},
                    {"x": xi + h, "y": f(xi + h)},
                    {"x": xi + 2*h, "y": f(xi + 2*h)}
                ]
            })
    
    elif req.method == "simpson_3_8":
        result = 0
        for i in range(0, n, 3):
            x0_i = a + i*h
            x1_i = x0_i + h
            x2_i = x0_i + 2*h
            x3_i = x0_i + 3*h
            result += f(x0_i) + 3*f(x1_i) + 3*f(x2_i) + f(x3_i)
        result *= 3 * h / 8
        formula = "∫f(x)dx ≈ (3h/8)·Σ[f(x_{3i}) + 3f(x_{3i+1}) + 3f(x_{3i+2}) + f(x_{3i+3})]"
        formula_latex = r"\int f(x)dx \approx \frac{3h}{8}\sum_{i=0}^{n/3-1}\left[f(x_{3i}) + 3f(x_{3i+1}) + 3f(x_{3i+2}) + f(x_{3i+3})\right]"
        for i in range(0, n, 3):
            xi = a + i*h
            shapes.append({
                "type": "cubic",
                "x1": xi, "x2": xi + 3*h,
                "points": [
                    {"x": xi, "y": f(xi)},
                    {"x": xi + h, "y": f(xi + h)},
                    {"x": xi + 2*h, "y": f(xi + 2*h)},
                    {"x": xi + 3*h, "y": f(xi + 3*h)}
                ]
            })
    
    truncation_error = None
    if req.function:
        try:
            if req.method in ["left_rectangle", "right_rectangle", "midpoint"]:
                second_derivative = sp.diff(f_expr, x, 2)
                probe_points = np.linspace(a, b, min(200, max(50, n * 5)))
                m2 = max(abs(float(second_derivative.subs(x, xi).evalf())) for xi in probe_points)
                if req.method == "midpoint":
                    truncation_error = ((b - a) * (h ** 2) * m2) / 24.0
                else:
                    truncation_error = ((b - a) * h * m2) / 2.0
            elif req.method == "trapezoidal":
                second_derivative = sp.diff(f_expr, x, 2)
                probe_points = np.linspace(a, b, min(200, max(50, n * 5)))
                m2 = max(abs(float(second_derivative.subs(x, xi).evalf())) for xi in probe_points)
                truncation_error = ((b - a) * (h ** 2) * m2) / 12.0
            elif req.method == "simpson_1_3":
                fourth_derivative = sp.diff(f_expr, x, 4)
                probe_points = np.linspace(a, b, min(200, max(50, n * 5)))
                m4 = max(abs(float(fourth_derivative.subs(x, xi).evalf())) for xi in probe_points)
                truncation_error = ((b - a) * (h ** 4) * m4) / 180.0
            elif req.method == "simpson_3_8":
                fourth_derivative = sp.diff(f_expr, x, 4)
                probe_points = np.linspace(a, b, min(200, max(50, n * 5)))
                m4 = max(abs(float(fourth_derivative.subs(x, xi).evalf())) for xi in probe_points)
                truncation_error = ((b - a) * (h ** 4) * m4) / 80.0
        except Exception:
            truncation_error = None

    # Calculate exact integral if possible
    try:
        if req.function:
            exact_integral = float(sp.integrate(f_expr, (x, a, b)).evalf())
            error = abs(exact_integral - result)
        else:
            exact_integral = None
            error = None
    except:
        exact_integral = None
        error = None
    
    return {
        "result": round(float(result), 10),
        "method": req.method,
        "formula": formula,
        "formula_latex": formula_latex,
        "n": n,
        "h": round(h, 10),
        "a": a,
        "b": b,
        "shapes": shapes,
        "values_table": [{"x": round(float(xi), 6), "y": round(yi, 6)} for xi, yi in zip(x_points, y_points)],
        "exact_integral": round(exact_integral, 10) if exact_integral is not None else None,
        "error": round(error, 10) if error is not None else None,
        "truncation_error": round(float(truncation_error), 10) if truncation_error is not None else None,
        "f_expr_latex": sp.latex(f_expr) if f_expr is not None else None,
        "source": "table" if from_table else "function"
    }


@app.post("/monte-carlo")
async def monte_carlo_integration(req: MonteCarloRequest):
    """Monte Carlo integration in 1D/2D/3D using hit-or-miss or mean-value methods."""
    bounds_array = normalize_bounds(req.bounds, req.dimension)
    domain_volume = compute_box_volume(bounds_array)
    rng = make_rng(req.seed)

    expr, symbols, compiled_fn = parse_multivariate_function(req.function, req.dimension)

    # Main domain samples used in both methods.
    domain_points = sample_points_in_domain(rng, bounds_array, req.n)
    f_values = evaluate_function_batch(compiled_fn, domain_points)

    finite_mask = np.isfinite(f_values)
    if not np.all(finite_mask):
        # Keep finite points only; if too many invalid values, fail early.
        domain_points = domain_points[finite_mask]
        f_values = f_values[finite_mask]

    if f_values.size < max(10, int(0.5 * req.n)):
        raise HTTPException(
            status_code=400,
            detail="Too many non-finite function evaluations in domain. Check function and bounds."
        )

    used_n = int(f_values.size)

    method_details = {}
    if req.method == "mean-value":
        mean_val = float(np.mean(f_values))
        estimate = domain_volume * mean_val
        std_val = float(np.std(f_values, ddof=1)) if used_n > 1 else 0.0
        standard_error = domain_volume * std_val / np.sqrt(used_n) if used_n > 1 else 0.0

        contributions = domain_volume * f_values
        accept_flags = None
        aux_values = f_values

    else:  # hit-or-miss
        z_low, z_high = estimate_function_range(compiled_fn, bounds_array, rng)
        z_height = z_high - z_low
        if z_height <= 0:
            raise HTTPException(status_code=400, detail="Invalid bounding box height for hit-or-miss")

        aux_values = rng.uniform(z_low, z_high, size=used_n)

        positive_hits = ((aux_values >= 0) & (aux_values <= f_values)).astype(int)
        negative_hits = ((aux_values < 0) & (aux_values >= f_values)).astype(int)
        signed_hits = positive_hits - negative_hits

        estimate = domain_volume * z_height * float(np.mean(signed_hits))
        std_hits = float(np.std(signed_hits, ddof=1)) if used_n > 1 else 0.0
        standard_error = domain_volume * z_height * std_hits / np.sqrt(used_n) if used_n > 1 else 0.0

        contributions = domain_volume * z_height * signed_hits
        accept_flags = signed_hits != 0

        method_details = {
            "bounding_low": round(float(z_low), 10),
            "bounding_high": round(float(z_high), 10),
            "bounding_height": round(float(z_height), 10),
            "accepted_points": int(np.count_nonzero(accept_flags)),
            "rejected_points": int(used_n - np.count_nonzero(accept_flags)),
        }

    exact_integral = maybe_exact_integral(expr, symbols, bounds_array)
    abs_error = abs(exact_integral - estimate) if exact_integral is not None else None

    point_limit = min(req.max_points_to_return, used_n)
    vis_points = []
    for i in range(point_limit):
        p = domain_points[i]
        item = {
            "x": round(float(p[0]), 8),
            "value": round(float(f_values[i]), 8),
        }
        if req.dimension >= 2:
            item["y"] = round(float(p[1]), 8)
        if req.dimension >= 3:
            item["z"] = round(float(p[2]), 8)

        # For hit-or-miss, this stores the extra sampled axis and acceptance status.
        if req.method == "hit-or-miss":
            item["aux"] = round(float(aux_values[i]), 8)
            item["accepted"] = bool(accept_flags[i])
        else:
            item["accepted"] = None

        vis_points.append(item)

    return {
        "method": req.method,
        "dimension": req.dimension,
        "function": req.function,
        "function_latex": sp.latex(expr),
        "bounds": [[float(b[0]), float(b[1])] for b in bounds_array],
        "n_requested": req.n,
        "n_used": used_n,
        "seed": req.seed,
        "domain_volume": round(float(domain_volume), 10),
        "estimate": round(float(estimate), 10),
        "standard_error": round(float(standard_error), 10),
        "confidence_95_half_width": round(float(1.96 * standard_error), 10),
        "exact_integral": round(float(exact_integral), 10) if exact_integral is not None else None,
        "abs_error": round(float(abs_error), 10) if abs_error is not None else None,
        "method_details": method_details,
        "sample_points": vis_points,
    }
