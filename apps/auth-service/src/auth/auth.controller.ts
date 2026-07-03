import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  InternalOnlyGuard,
  JwtAuthGuard,
  JwtPayload,
} from '@app/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /** Lets other services (and the frontend) verify a token & read the user. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return user;
  }

  /**
   * Internal-only: resolve a user by email (used by group-service to add
   * members by email). Requires the internal API key.
   */
  @Get('internal/by-email')
  @UseGuards(InternalOnlyGuard)
  byEmail(@Query('email') email: string) {
    return this.auth.findByEmail(email);
  }
}
