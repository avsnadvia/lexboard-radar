import { PrismaClient, Area } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Primeira fonte: Trabalhista — Ribeirão Preto (TRT-15). Começa em 2026.
  const fonte = await prisma.fonte.upsert({
    where: {
      datajudAlias_orgaoContains_area: {
        datajudAlias: "api_publica_trt15",
        orgaoContains: "Ribeirão Preto",
        area: Area.TRABALHISTA,
      },
    },
    update: {},
    create: {
      nome: "Trabalhista — Ribeirão Preto",
      datajudAlias: "api_publica_trt15",
      orgaoContains: "Ribeirão Preto",
      area: Area.TRABALHISTA,
      cursorAjuizamento: process.env.DATAJUD_START ?? "20260101000000",
    },
  });

  // Usuário admin: a senha é SEMPRE sincronizada com ADMIN_PASSWORD a cada deploy.
  const email = process.env.ADMIN_EMAIL ?? "rodrigo@avsn.com.br";
  const password = process.env.ADMIN_PASSWORD ?? "trocar-no-primeiro-acesso";
  const passwordHash = bcrypt.hashSync(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, isAdmin: true },
    create: {
      email,
      name: "Rodrigo",
      passwordHash,
      isAdmin: true,
    },
  });

  console.log(`Seed OK — fonte "${fonte.nome}" criada e admin ${email}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
