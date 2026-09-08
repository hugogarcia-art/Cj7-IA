import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { identifier: string; password: string }) {
    return this.authService.login(body.identifier, body.password);
  }

  // NUEVA RUTA: REGISTRO
  @Post('register')
  async register(
    @Body()
    body: {
      username: string;
      email: string;
      password: string;
      fullName?: string;
      gender?: string;
    },
  ) {
    return this.authService.register(
      body.username,
      body.email,
      body.password,
      body.fullName,
      body.gender,
    );
  }
}
