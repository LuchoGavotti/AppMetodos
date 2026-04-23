import type {
  BisectionRequest,
  BisectionResponse,
  FixedPointRequest,
  FixedPointResponse,
  AitkenRequest,
  AitkenResponse,
  NewtonRaphsonRequest,
  NewtonRaphsonResponse,
  InterpolationRequest,
  InterpolationResponse,
  DerivativeRequest,
  DerivativeResponse,
  IntegrationRequest,
  IntegrationResponse,
  MonteCarloRequest,
  MonteCarloResponse,
  DifferentialEquationRequest,
  DifferentialEquationResponse,
  APIError,
} from "@/types/methods";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

class APIClient {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    });

    if (!response.ok) {
      const error: APIError = await response.json();
      throw error;
    }

    return response.json();
  }

  async healthCheck(): Promise<{ status: string; service: string }> {
    return this.request("/health");
  }

  async bisection(data: BisectionRequest): Promise<BisectionResponse> {
    return this.request("/bisection", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async fixedPoint(data: FixedPointRequest): Promise<FixedPointResponse> {
    return this.request("/fixed-point", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async aitken(data: AitkenRequest): Promise<AitkenResponse> {
    return this.request("/aitken", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async newtonRaphson(
    data: NewtonRaphsonRequest
  ): Promise<NewtonRaphsonResponse> {
    return this.request("/newton-raphson", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async interpolation(
    data: InterpolationRequest
  ): Promise<InterpolationResponse> {
    return this.request("/interpolation", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async derivative(data: DerivativeRequest): Promise<DerivativeResponse> {
    return this.request("/derivative", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async integration(data: IntegrationRequest): Promise<IntegrationResponse> {
    return this.request("/integration", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async monteCarlo(data: MonteCarloRequest): Promise<MonteCarloResponse> {
    return this.request("/monte-carlo", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async differentialEquation(
    data: DifferentialEquationRequest
  ): Promise<DifferentialEquationResponse> {
    return this.request("/differential-equation", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}

export const api = new APIClient();
