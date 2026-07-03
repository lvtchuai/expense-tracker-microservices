import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { INTERNAL_HEADER } from '@app/common';

export interface ResolvedUser {
  id: string;
  email: string;
  displayName: string | null;
}

/** Calls auth-service's internal endpoint to resolve users by email. */
@Injectable()
export class AuthClient {
  private readonly logger = new Logger(AuthClient.name);
  private readonly baseUrl: string;
  private readonly internalKey: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>(
      'AUTH_SERVICE_URL',
      'http://localhost:3001',
    );
    this.internalKey = config.get<string>('INTERNAL_API_KEY', '');
  }

  async findByEmail(email: string): Promise<ResolvedUser> {
    let res: Response;
    try {
      const url = new URL(`${this.baseUrl}/api/auth/internal/by-email`);
      url.searchParams.set('email', email);
      res = await fetch(url, {
        headers: { [INTERNAL_HEADER]: this.internalKey },
      });
    } catch (e) {
      this.logger.error(`auth-service unreachable: ${(e as Error).message}`);
      throw new ServiceUnavailableException('auth-service unreachable');
    }
    if (res.status === 404) {
      throw new NotFoundException(`no user with email ${email}`);
    }
    if (!res.ok) {
      throw new ServiceUnavailableException(
        `auth-service returned ${res.status}`,
      );
    }
    return (await res.json()) as ResolvedUser;
  }
}
