import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto, RegisterDto } from './dto/auth.dto';

const BCRYPT_ROUNDS = 12;
const FIRST_CLIENT_CODE = 150501;

/** Las contraseñas migradas y nuevas son hashes bcrypt ($2a$/$2b$/$2y$). */
function isBcryptHash(value: string): boolean {
  return /^\$2[aby]?\$/.test(value);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login({ identifier, password }: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    // Comparamos siempre contra un hash aunque el usuario no exista, para que
    // el tiempo de respuesta no revele qué correos están registrados.
    const storedHash =
      user && isBcryptHash(user.password)
        ? user.password
        : '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin';

    const passwordMatches = await bcrypt.compare(password, storedHash);

    // Cuenta creada antes del hasheo y que la migración no alcanzó: la migramos
    // al vuelo en el primer login correcto.
    if (user && !isBcryptHash(user.password)) {
      if (user.password !== password) {
        throw new UnauthorizedException('Credenciales incorrectas');
      }
      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: await bcrypt.hash(password, BCRYPT_ROUNDS) },
      });
      return this.buildSession(user);
    }

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    return this.buildSession(user);
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        'El correo o nombre de usuario ya está en uso.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // clientCode es @unique y lo calculamos con "último + 1". Dos registros
    // simultáneos pueden pedir el mismo número, así que reintentamos ante P2002.
    for (let attempt = 0; attempt < 5; attempt++) {
      const lastUser = await this.prisma.user.findFirst({
        orderBy: { clientCode: 'desc' },
        select: { clientCode: true },
      });
      const newClientCode = lastUser
        ? lastUser.clientCode + 1
        : FIRST_CLIENT_CODE;

      try {
        const newUser = await this.prisma.user.create({
          data: {
            username: dto.username,
            email: dto.email,
            password: passwordHash,
            // El rol nunca viene del cliente: registrarse no puede dar ADMIN.
            role: 'USER',
            fullName: dto.fullName ?? null,
            gender: dto.gender ?? null,
            clientCode: newClientCode,
          },
        });
        return this.buildSession(newUser);
      } catch (error: unknown) {
        if (!isUniqueConstraintError(error)) throw error;
        // Colisión de clientCode (o carrera en email/username): reintentamos.
      }
    }

    throw new BadRequestException(
      'No se pudo completar el registro. Inténtalo de nuevo.',
    );
  }

  private buildSession(user: {
    id: string;
    email: string;
    username: string;
    fullName: string | null;
    gender: string | null;
    bio: string | null;
    clientCode: number;
    role: string;
  }) {
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

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
        role: user.role,
      },
    };
  }

  /** Perfil fresco desde la BD (el de localStorage puede estar desactualizado). */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        gender: true,
        bio: true,
        clientCode: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) throw new UnauthorizedException('La cuenta ya no existe.');
    return user;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}
