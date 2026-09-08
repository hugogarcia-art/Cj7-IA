/**
 * Migración de un solo uso: convierte las contraseñas guardadas en texto plano
 * a hashes bcrypt. Es idempotente — vuelve a ejecutarse sin efectos.
 *
 *   npm run data:hash-passwords
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, password: true },
  });

  let migrated = 0;
  for (const user of users) {
    if (/^\$2[aby]?\$/.test(user.password)) continue; // ya hasheada
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(user.password, BCRYPT_ROUNDS) },
    });
    migrated++;
    console.log(`  ✔ ${user.email}`);
  }

  console.log(
    `\n${migrated} contraseña(s) hasheadas, ${users.length - migrated} ya lo estaban.`,
  );
}

main()
  .catch((error) => {
    console.error('Error en la migración:', error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
