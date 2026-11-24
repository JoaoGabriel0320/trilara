// Copia os PDFs e imagens referenciados pelo banco para o S3, sem apagar o disco.
// Primeiro rode sem --execute para conferir; a execução pode ser repetida.
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { PrismaClient } from '@prisma/client'
import { chaveS3, chaveValida, diretorioBase } from '../src/lib/storage'

const prisma = new PrismaClient()
const executar = process.argv.includes('--execute')
const bucket = process.env.S3_BUCKET_DOCUMENTOS?.trim()
const s3 = new S3Client({ region: process.env.AWS_REGION || 'sa-east-1' })

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function objetoAusente(erro: unknown): boolean {
  if (!erro || typeof erro !== 'object') return false
  const e = erro as { name?: string; $metadata?: { httpStatusCode?: number } }
  return e.name === 'NoSuchKey' || e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404
}

async function lerS3(chave: string): Promise<Uint8Array | null> {
  try {
    const objeto = await s3.send(new GetObjectCommand({ Bucket: bucket!, Key: chaveS3(chave) }))
    if (!objeto.Body) throw new Error(`Objeto vazio: ${chave}`)
    return objeto.Body.transformToByteArray()
  } catch (erro) {
    if (objetoAusente(erro)) return null
    throw erro
  }
}

async function main() {
  if (!bucket) throw new Error('Defina S3_BUCKET_DOCUMENTOS antes de migrar.')
  const [documentos, imagens] = await Promise.all([
    prisma.documento.findMany({ where: { arquivoKey: { not: null } }, select: { arquivoKey: true, arquivoBytes: true } }),
    prisma.documentoImagem.findMany({ select: { arquivoKey: true, arquivoBytes: true } }),
  ])
  const arquivos = new Map<string, number | null>()
  for (const doc of documentos) if (doc.arquivoKey) arquivos.set(doc.arquivoKey, doc.arquivoBytes)
  for (const imagem of imagens) arquivos.set(imagem.arquivoKey, imagem.arquivoBytes)

  let copiados = 0
  let existentes = 0
  let pendentes = 0
  let falhas = 0
  console.log(`${arquivos.size} arquivo(s) referenciado(s). Modo: ${executar ? 'cópia' : 'conferência'}.`)
  for (const [chave, tamanhoEsperado] of arquivos) {
    try {
      if (!chaveValida(chave)) throw new Error('Chave inválida no banco')
      const noS3 = await lerS3(chave)
      let local: Buffer | null = null
      try {
        local = await readFile(path.join(diretorioBase(), chave))
      } catch (erro) {
        if ((erro as NodeJS.ErrnoException).code !== 'ENOENT') throw erro
      }
      if (tamanhoEsperado !== null && (local?.byteLength ?? noS3?.byteLength) !== tamanhoEsperado) {
        throw new Error(`Tamanho diferente do banco (${tamanhoEsperado} bytes)`)
      }
      if (noS3) {
        if (local && sha256(local) !== sha256(noS3)) throw new Error('Conteúdo local difere do S3')
        existentes++
        continue
      }
      if (!local) throw new Error('Arquivo ausente no disco e no S3')
      if (!executar) {
        pendentes++
        continue
      }
      const mime = chave.endsWith('.pdf') ? 'application/pdf' : chave.endsWith('.png') ? 'image/png' : chave.endsWith('.webp') ? 'image/webp' : 'image/jpeg'
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: chaveS3(chave), Body: local, ContentType: mime }))
      const enviado = await lerS3(chave)
      if (!enviado || sha256(local) !== sha256(enviado)) throw new Error('Falha na conferência após envio')
      copiados++
    } catch (erro) {
      falhas++
      console.error(`Falha em ${chave}:`, erro)
    }
  }
  console.log({ existentes, copiados, pendentes, falhas })
  if (falhas) process.exitCode = 1
}

main().catch((erro) => { console.error(erro); process.exitCode = 1 }).finally(() => prisma.$disconnect())
