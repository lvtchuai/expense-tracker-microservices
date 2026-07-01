import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { INTERNAL_HEADER, INTERNAL_USER_HEADER } from './internal.constants';
import { JwtPayload } from './jwt-payload.interface';

/**
 * Authenticates a request as EITHER:
 *  - a normal user (valid Bearer JWT — delegates to passport 'jwt'), or
 *  - an internal service call (valid x-internal-key header + x-internal-user-id).
 *
 * On the internal path we synthesize request.user from the header so
 * controllers using @CurrentUser() work unchanged.
 */
@Injectable()
export class UserOrInternalGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const internalKey = req.headers[INTERNAL_HEADER];

    if (internalKey) {
      const expected = this.config.get<string>('INTERNAL_API_KEY');
      const userId = req.headers[INTERNAL_USER_HEADER];
      if (!expected || internalKey !== expected) {
        throw new UnauthorizedException('invalid internal key');
      }
      if (!userId) {
        throw new UnauthorizedException('missing internal user id');
      }
      req.user = { sub: userId, email: 'internal@service' } as JwtPayload;
      return true;
    }

    // Fall back to normal user-JWT validation.
    return (await super.canActivate(context)) as boolean;
  }
}
