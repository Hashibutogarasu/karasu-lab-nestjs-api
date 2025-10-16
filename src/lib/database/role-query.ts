import prisma from './query';

export async function findAllRoles() {
  return prisma.role.findMany();
}

export async function findRoleByName(name: string) {
  return prisma.role.findUnique({
    where: { name },
  });
}

export async function findRoleById(id: string) {
  return prisma.role.findUnique({
    where: { id },
  });
}

export async function createRole(name: string, bitmask: number) {
  return prisma.role.create({
    data: {
      name,
      bitmask,
    },
  });
}

export async function deleteRole(id: string) {
  await prisma.role.delete({
    where: {
      id,
    },
  });
}

export async function upsertRoleByName(
  name: string,
  options: { name: string; description?: string; bitmask: number },
) {
  return await prisma.role.upsert({
    where: {
      name,
    },
    create: {
      name,
      description: options.description,
      bitmask: options.bitmask,
    },
    update: {
      name,
      description: options.description,
      bitmask: options.bitmask,
    },
  });
}
