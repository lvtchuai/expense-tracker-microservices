/** Claims embedded in the access token, issued by auth-service. */
export interface JwtPayload {
  sub: string; // user id
  email: string;
  iat?: number;
  exp?: number;
}
