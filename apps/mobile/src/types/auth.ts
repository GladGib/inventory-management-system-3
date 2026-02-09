/**
 * Auth types aligned with the backend API contracts.
 *
 * The backend NestJS API uses URI versioning with prefix /api/v1/
 * and returns tokens as { accessToken, refreshToken, tokenType, expiresIn }.
 */

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  organizationId: string;
  organization: Organization;
  /** Present when the user belongs to multiple organizations. */
  organizations?: Organization[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  organizationName: string;
  industry?: 'AUTO_PARTS' | 'HARDWARE' | 'SPARE_PARTS' | 'GENERAL';
}

export interface TokensResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
}

export interface RegisterResponse extends TokensResponse {
  user: User;
}
