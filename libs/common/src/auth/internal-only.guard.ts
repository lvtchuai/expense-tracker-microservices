import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { INTERNAL_HEADER } from './internal.constants';

/**
 * Guards an endpoint that ONLY other services may call (no user path).
 * Requires a valid x-internal-key header matching INTERNAL_API_KEY.
 */
@Injectable()
export class InternalOnlyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const key = req.headers[INTERNAL_HEADER];
    const expected = this.config.get<string>('INTERNAL_API_KEY');
    if (!expected || key !== expected) {
      throw new UnauthorizedException('internal only');
    }
    return true;
  }
}
