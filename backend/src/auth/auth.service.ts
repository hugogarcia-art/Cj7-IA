import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

type AuthUser = {
  id: string;
  email: string;
  username: string | null;
  password: string;
  fullName: string | null;
  gender: string | null;
  bio: string | null;
  clientCode: number;
  role: string;
};

@Injectable()
export class AuthService {
  private prisma = new PrismaClient();

  constructor(private jwtService: JwtService) {}

  async login(identifier: string, password: string) {
    // Buscamos si existe un usuario con ese correo O con ese nombre de usuario
    const user = (await this.prisma.user.findFirst({
      where: {
        OR: [
          { id: identifier },
          { email: identifier },
          { username: identifier },
        ],
      },
    })) as AuthUser | null;

    if (!user || user.password !== password) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        gender: user.gender,
        bio: user.bio,
        clientCode: user.clientCode,
      },
    };
  }

  async register(
    username: string,
    email: string,
    password: string,
    fullName?: string,
    gender?: string,
  ) {
    // Verificamos si el correo o el usuario ya existen
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: email }, { username: username }],
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        'El correo o nombre de usuario ya está en uso.',
      );
    }
    // LÓGICA NUEVA: Buscamos el último usuario para ver qué número de cliente le toca
    const lastUser = (await this.prisma.user.findFirst({
      orderBy: { clientCode: 'desc' },
    })) as AuthUser | null;

    // Si no hay usuarios, empieza en 150501. Si hay, le suma 1 al último.
    const newClientCode = lastUser ? Number(lastUser.clientCode) + 1 : 150501;

    // Creamos el usuario (El ID se genera automáticamente en la base de datos)
    const newUser = (await this.prisma.user.create({
      data: {
        username,
        email,
        password,
        role: 'USER',
        fullName: fullName ?? null,
        clientCode: newClientCode,
        gender: gender ?? null,
      },
    })) as AuthUser;

    const payload = { sub: newUser.id, email: newUser.email };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: username,
        fullName: newUser.fullName,
        gender: newUser.gender,
        clientCode: newUser.clientCode,
        bio: newUser.bio,
      },
    };
  }
}
