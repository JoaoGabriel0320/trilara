-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('COLABORADOR', 'EDITOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Publico" AS ENUM ('INTERNO', 'EXTERNO');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('PDF', 'ARTIGO', 'LINK', 'GIF', 'PASSO_A_PASSO');

-- CreateEnum
CREATE TYPE "TipoDestaquePasso" AS ENUM ('REGRA', 'ATENCAO', 'DICA');

-- CreateEnum
CREATE TYPE "StatusRelatoDocumento" AS ENUM ('ABERTO', 'RESOLVIDO');

-- CreateEnum
CREATE TYPE "StatusIdeia" AS ENUM ('NOVA', 'EM_ANALISE', 'APROVADA', 'ARQUIVADA');

-- CreateEnum
CREATE TYPE "StatusSolicitacao" AS ENUM ('PENDENTE', 'APROVADA', 'REPROVADA');

-- CreateTable
CREATE TABLE "Colaborador" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "cargo" TEXT,
    "filialNome" TEXT,
    "fotoKey" TEXT,
    "papel" "Papel" NOT NULL DEFAULT 'COLABORADOR',
    "tipoAcesso" "Publico" NOT NULL DEFAULT 'INTERNO',
    "empresaNome" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "adminProtegido" BOOLEAN NOT NULL DEFAULT false,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoLoginEm" TIMESTAMP(3),
    "ultimaAtividadeEm" TIMESTAMP(3),
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),

    CONSTRAINT "Colaborador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessaoColaborador" (
    "id" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "substituidaEm" TIMESTAMP(3),

    CONSTRAINT "SessaoColaborador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SistemaCadastro" (
    "slug" TEXT NOT NULL,
    "dados" JSONB NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SistemaCadastro_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "Filial" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Filial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Departamento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Departamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitacaoAcesso" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "tipoAcesso" "Publico" NOT NULL DEFAULT 'INTERNO',
    "empresaNome" TEXT,
    "departamento" TEXT,
    "filialId" TEXT,
    "status" "StatusSolicitacao" NOT NULL DEFAULT 'PENDENTE',
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decididaEm" TIMESTAMP(3),
    "decididaPorId" TEXT,

    CONSTRAINT "SolicitacaoAcesso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "sistemaSlug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "sistemaSlug" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "TipoDocumento" NOT NULL DEFAULT 'PDF',
    "publico" "Publico" NOT NULL DEFAULT 'INTERNO',
    "arquivoKey" TEXT,
    "arquivoNome" TEXT,
    "arquivoBytes" INTEGER,
    "conteudo" TEXT,
    "urlExterna" TEXT,
    "palavrasChave" TEXT,
    "comecePorAqui" BOOLEAN NOT NULL DEFAULT false,
    "categoriaId" TEXT,
    "autorId" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "visualizacoes" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndiceDocumentoAssistente" (
    "documentoId" TEXT NOT NULL,
    "assinatura" TEXT NOT NULL,
    "dados" JSONB NOT NULL,
    "indexadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndiceDocumentoAssistente_pkey" PRIMARY KEY ("documentoId")
);

-- CreateTable
CREATE TABLE "RelatoDocumento" (
    "id" TEXT NOT NULL,
    "documentoId" TEXT,
    "tituloDocumento" TEXT NOT NULL,
    "sistemaSlug" TEXT NOT NULL,
    "autorId" TEXT,
    "autorNome" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "passoNumero" INTEGER,
    "passoTitulo" TEXT,
    "status" "StatusRelatoDocumento" NOT NULL DEFAULT 'ABERTO',
    "resolvidoPor" TEXT,
    "resolvidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelatoDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoritoDocumento" (
    "colaboradorId" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoritoDocumento_pkey" PRIMARY KEY ("colaboradorId","documentoId")
);

-- CreateTable
CREATE TABLE "DocumentoImagem" (
    "id" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "arquivoKey" TEXT NOT NULL,
    "arquivoNome" TEXT NOT NULL,
    "arquivoBytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "legenda" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoImagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassoDocumento" (
    "id" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT,
    "caminhoAcesso" TEXT,
    "imagemId" TEXT,
    "imagemAcessoId" TEXT,
    "destaqueTipo" "TipoDestaquePasso",
    "destaqueTexto" TEXT,

    CONSTRAINT "PassoDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ideia" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "resumo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "sistemaSlug" TEXT,
    "status" "StatusIdeia" NOT NULL DEFAULT 'NOVA',
    "autorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ideia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApoioIdeia" (
    "id" TEXT NOT NULL,
    "ideiaId" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApoioIdeia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvaliacaoSistema" (
    "id" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "sistemaSlug" TEXT NOT NULL,
    "filialNome" TEXT,
    "nota" INTEGER NOT NULL,
    "gosta" TEXT,
    "melhorar" TEXT,
    "gostaria" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvaliacaoSistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorNome" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "descricao" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsoAssistente" (
    "id" TEXT NOT NULL,
    "colaboradorId" TEXT,
    "sistemaSlug" TEXT,
    "provedor" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "entradaTokens" INTEGER,
    "saidaTokens" INTEGER,
    "totalTokens" INTEGER,
    "limiteReqDia" INTEGER,
    "restantesReqDia" INTEGER,
    "resetReqEm" TIMESTAMP(3),
    "limiteTokensMin" INTEGER,
    "restantesTokensMin" INTEGER,
    "resetTokensEm" TIMESTAMP(3),
    "duracaoMs" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsoAssistente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversaAssistente" (
    "id" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "sistemaSlug" TEXT,
    "titulo" TEXT NOT NULL,
    "provedorIa" TEXT,
    "modeloIa" TEXT,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadaEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversaAssistente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultaAssistente" (
    "id" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "conversaId" TEXT NOT NULL,
    "sistemaSlug" TEXT,
    "pergunta" TEXT NOT NULL,
    "resposta" TEXT NOT NULL,
    "fontes" JSONB NOT NULL,
    "aviso" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultaAssistente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Colaborador_email_key" ON "Colaborador"("email");

-- CreateIndex
CREATE INDEX "Colaborador_ativo_idx" ON "Colaborador"("ativo");

-- CreateIndex
CREATE INDEX "Colaborador_ultimaAtividadeEm_idx" ON "Colaborador"("ultimaAtividadeEm");

-- CreateIndex
CREATE INDEX "SessaoColaborador_colaboradorId_idx" ON "SessaoColaborador"("colaboradorId");

-- CreateIndex
CREATE INDEX "SessaoColaborador_colaboradorId_substituidaEm_idx" ON "SessaoColaborador"("colaboradorId", "substituidaEm");

-- CreateIndex
CREATE INDEX "SessaoColaborador_expiraEm_idx" ON "SessaoColaborador"("expiraEm");

-- CreateIndex
CREATE INDEX "SistemaCadastro_ativo_idx" ON "SistemaCadastro"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "Filial_nome_key" ON "Filial"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Departamento_nome_key" ON "Departamento"("nome");

-- CreateIndex
CREATE INDEX "SolicitacaoAcesso_status_criadaEm_idx" ON "SolicitacaoAcesso"("status", "criadaEm");

-- CreateIndex
CREATE INDEX "SolicitacaoAcesso_email_status_idx" ON "SolicitacaoAcesso"("email", "status");

-- CreateIndex
CREATE INDEX "Categoria_sistemaSlug_ativo_ordem_idx" ON "Categoria"("sistemaSlug", "ativo", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_sistemaSlug_nome_key" ON "Categoria"("sistemaSlug", "nome");

-- CreateIndex
CREATE INDEX "Documento_publico_sistemaSlug_ativo_ordem_idx" ON "Documento"("publico", "sistemaSlug", "ativo", "ordem");

-- CreateIndex
CREATE INDEX "Documento_sistemaSlug_ativo_ordem_idx" ON "Documento"("sistemaSlug", "ativo", "ordem");

-- CreateIndex
CREATE INDEX "Documento_categoriaId_idx" ON "Documento"("categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "Documento_sistemaSlug_slug_key" ON "Documento"("sistemaSlug", "slug");

-- CreateIndex
CREATE INDEX "RelatoDocumento_status_criadoEm_idx" ON "RelatoDocumento"("status", "criadoEm");

-- CreateIndex
CREATE INDEX "RelatoDocumento_documentoId_status_idx" ON "RelatoDocumento"("documentoId", "status");

-- CreateIndex
CREATE INDEX "FavoritoDocumento_colaboradorId_criadoEm_idx" ON "FavoritoDocumento"("colaboradorId", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoImagem_arquivoKey_key" ON "DocumentoImagem"("arquivoKey");

-- CreateIndex
CREATE INDEX "DocumentoImagem_documentoId_ordem_idx" ON "DocumentoImagem"("documentoId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "PassoDocumento_imagemId_key" ON "PassoDocumento"("imagemId");

-- CreateIndex
CREATE UNIQUE INDEX "PassoDocumento_imagemAcessoId_key" ON "PassoDocumento"("imagemAcessoId");

-- CreateIndex
CREATE UNIQUE INDEX "PassoDocumento_documentoId_ordem_key" ON "PassoDocumento"("documentoId", "ordem");

-- CreateIndex
CREATE INDEX "Ideia_status_criadoEm_idx" ON "Ideia"("status", "criadoEm");

-- CreateIndex
CREATE INDEX "Ideia_sistemaSlug_idx" ON "Ideia"("sistemaSlug");

-- CreateIndex
CREATE INDEX "Ideia_autorId_idx" ON "Ideia"("autorId");

-- CreateIndex
CREATE INDEX "ApoioIdeia_ideiaId_idx" ON "ApoioIdeia"("ideiaId");

-- CreateIndex
CREATE UNIQUE INDEX "ApoioIdeia_ideiaId_colaboradorId_key" ON "ApoioIdeia"("ideiaId", "colaboradorId");

-- CreateIndex
CREATE INDEX "AvaliacaoSistema_colaboradorId_sistemaSlug_criadoEm_idx" ON "AvaliacaoSistema"("colaboradorId", "sistemaSlug", "criadoEm");

-- CreateIndex
CREATE INDEX "AvaliacaoSistema_sistemaSlug_criadoEm_idx" ON "AvaliacaoSistema"("sistemaSlug", "criadoEm");

-- CreateIndex
CREATE INDEX "AvaliacaoSistema_filialNome_criadoEm_idx" ON "AvaliacaoSistema"("filialNome", "criadoEm");

-- CreateIndex
CREATE INDEX "AuditLog_criadoEm_idx" ON "AuditLog"("criadoEm");

-- CreateIndex
CREATE INDEX "AuditLog_entidade_idx" ON "AuditLog"("entidade");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "UsoAssistente_criadoEm_idx" ON "UsoAssistente"("criadoEm");

-- CreateIndex
CREATE INDEX "UsoAssistente_provedor_criadoEm_idx" ON "UsoAssistente"("provedor", "criadoEm");

-- CreateIndex
CREATE INDEX "UsoAssistente_colaboradorId_criadoEm_idx" ON "UsoAssistente"("colaboradorId", "criadoEm");

-- CreateIndex
CREATE INDEX "ConversaAssistente_colaboradorId_atualizadaEm_idx" ON "ConversaAssistente"("colaboradorId", "atualizadaEm");

-- CreateIndex
CREATE INDEX "ConversaAssistente_atualizadaEm_idx" ON "ConversaAssistente"("atualizadaEm");

-- CreateIndex
CREATE INDEX "ConsultaAssistente_colaboradorId_criadoEm_idx" ON "ConsultaAssistente"("colaboradorId", "criadoEm");

-- CreateIndex
CREATE INDEX "ConsultaAssistente_conversaId_criadoEm_idx" ON "ConsultaAssistente"("conversaId", "criadoEm");

-- CreateIndex
CREATE INDEX "ConsultaAssistente_criadoEm_idx" ON "ConsultaAssistente"("criadoEm");

-- AddForeignKey
ALTER TABLE "SessaoColaborador" ADD CONSTRAINT "SessaoColaborador_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoAcesso" ADD CONSTRAINT "SolicitacaoAcesso_filialId_fkey" FOREIGN KEY ("filialId") REFERENCES "Filial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Colaborador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndiceDocumentoAssistente" ADD CONSTRAINT "IndiceDocumentoAssistente_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatoDocumento" ADD CONSTRAINT "RelatoDocumento_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatoDocumento" ADD CONSTRAINT "RelatoDocumento_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Colaborador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoritoDocumento" ADD CONSTRAINT "FavoritoDocumento_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoritoDocumento" ADD CONSTRAINT "FavoritoDocumento_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoImagem" ADD CONSTRAINT "DocumentoImagem_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassoDocumento" ADD CONSTRAINT "PassoDocumento_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassoDocumento" ADD CONSTRAINT "PassoDocumento_imagemId_fkey" FOREIGN KEY ("imagemId") REFERENCES "DocumentoImagem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassoDocumento" ADD CONSTRAINT "PassoDocumento_imagemAcessoId_fkey" FOREIGN KEY ("imagemAcessoId") REFERENCES "DocumentoImagem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ideia" ADD CONSTRAINT "Ideia_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApoioIdeia" ADD CONSTRAINT "ApoioIdeia_ideiaId_fkey" FOREIGN KEY ("ideiaId") REFERENCES "Ideia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApoioIdeia" ADD CONSTRAINT "ApoioIdeia_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvaliacaoSistema" ADD CONSTRAINT "AvaliacaoSistema_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsoAssistente" ADD CONSTRAINT "UsoAssistente_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversaAssistente" ADD CONSTRAINT "ConversaAssistente_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultaAssistente" ADD CONSTRAINT "ConsultaAssistente_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultaAssistente" ADD CONSTRAINT "ConsultaAssistente_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "ConversaAssistente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
