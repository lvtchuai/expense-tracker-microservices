import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Stateless JWT guard. Any service that shares JWT_SECRET can verify a token
 * issued by auth-service without a network call. Register JwtStrategy in the
 * consuming module for this to resolve.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
