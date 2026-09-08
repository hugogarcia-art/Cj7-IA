/**
 * Reasigna clientes y productos existentes a una cuenta real.
 *
 * Antes, los datos creados por el webhook o los formularios se colgaban de un
 * usuario "admin@cj7ia.com" autogenerado. Ahora que cada cuenta solo ve lo
 * suyo, hay que mover esos registros a tu cuenta:
 *
 *   npm run data:claim -- tu@correo.com
 *   npm run data:claim -- tu@correo.com --from admin@cj7ia.com
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const targetIdentifier = args.find((arg) => !arg.startsWith('--'));
  const fromIndex = args.indexOf('--from');
  const sourceIdentifier = fromIndex >= 0 ? args[fromIndex + 1] : undefined;

  if (!targetIdentifier) {
    console.error(
      'Uso: npm run data:claim -- <correo-o-usuario> [--from <correo>]',
    );
    process.exitCode = 1;
    return;
  }

  const target = await prisma.user.findFirst({
    where: {
      OR: [{ email: targetIdentifier }, { username: targetIdentifier }],
    },
    select: { id: true, email: true, username: true },
  });

  if (!target) {
    console.error(`No existe ninguna cuenta con "${targetIdentifier}".`);
    process.exitCode = 1;
    return;
  }

  let sourceUserId: string | undefined;
  if (sourceIdentifier) {
    const source = await prisma.user.findFirst({
      where: {
        OR: [{ email: sourceIdentifier }, { username: sourceIdentifier }],
      },
      select: { id: true },
    });
    if (!source) {
      console.error(`No existe ninguna cuenta origen "${sourceIdentifier}".`);
      process.exitCode = 1;
      return;
    }
    sourceUserId = source.id;
  }

  // Sin --from movemos todo lo que NO sea ya del destino.
  const where = sourceUserId
    ? { userId: sourceUserId }
    : { userId: { not: target.id } };

  const [clients, products] = await prisma.$transaction([
    prisma.client.updateMany({ where, data: { userId: target.id } }),
    prisma.product.updateMany({ where, data: { userId: target.id } }),
  ]);

  console.log(
    `Reasignados a ${target.email} (@${target.username}):\n` +
      `  ${clients.count} cliente(s)\n  ${products.count} producto(s)`,
  );
}

main()
  .catch((error) => {
    console.error('Error reasignando datos:', error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
