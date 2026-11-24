// src/lib/storage.ts
//
// Armazenamento privado dos PDFs, GIFs e imagens: S3 quando configurado, disco caso contrário.
// Nada em public/ passa pelo middleware — um manual ali seria servido por URL
// direta para a internet inteira. Os arquivos aqui só saem pelas rotas
// /api/documentos/[id]/arquivo e /api/documentos/[id]/imagens/[imagemId],
// que validam a sessão antes do stream.
//
// Os arquivos antigos continuam legíveis do disco durante a migração para S3.

import { createReadStream } from 'node:fs'
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

export const TAMANHO_MAXIMO_BYTES = 25 * 1024 * 1024 // 25 MB
export const TAMANHO_MAXIMO_IMAGEM_BYTES = 8 * 1024 * 1024 // 8 MB por imagem
export const MAX_IMAGENS_DOCUMENTO = 20

const PASTA_PADRAO_DEV = '.docs-storage'
const PREFIXO_S3 = 'trilara/documentos/'
let clienteS3: S3Client | undefined

function bucketS3(): string | undefined {
  return process.env.S3_BUCKET_DOCUMENTOS?.trim() || undefined
}

function s3(): S3Client {
  return clienteS3 ??= new S3Client({ region: process.env.AWS_REGION || 'sa-east-1' })
}

export function chaveS3(chave: string): string {
  if (!chaveValida(chave)) throw new Error(`Chave de arquivo inválida: ${chave}`)
  return `${PREFIXO_S3}${chave}`
}

function erroObjetoAusente(erro: unknown): boolean {
  if (!erro || typeof erro !== 'object') return false
  const e = erro as { name?: string; $metadata?: { httpStatusCode?: number } }
  return e.name === 'NotFound' || e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404
}

async function cabecalhoS3(chave: string) {
  const bucket = bucketS3()
  if (!bucket) return null
  try {
    return await s3().send(new HeadObjectCommand({ Bucket: bucket, Key: chaveS3(chave) }))
  } catch (erro) {
    if (erroObjetoAusente(erro)) return null
    throw erro
  }
}

export function diretorioBase(): string {
  // Caminho relativo resolvido em runtime: usar process.cwd() aqui faz o build
  // marcar o projeto inteiro no file trace.
  return process.env.DOCS_STORAGE_DIR || path.resolve(/*turbopackIgnore: true*/ PASTA_PADRAO_DEV)
}

// Só aceitamos chaves que nós mesmos geramos: <sistema>/<uuid>.<extensão>.
// Isso mata path traversal (../../etc/passwd) na origem, em vez de tentar limpar
// a string depois.
const CHAVE_VALIDA = /^[a-z0-9][a-z0-9-]{0,63}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:pdf|jpg|png|webp|gif)$/
const SISTEMA_VALIDO = /^[a-z0-9][a-z0-9-]{0,63}$/

type FormatoImagem = { mimeType: 'image/jpeg' | 'image/png' | 'image/webp'; extensao: 'jpg' | 'png' | 'webp' }

export class ImagemInvalidaError extends Error {}

export function pdfValido(bytes: Buffer): boolean {
  return bytes.length >= 5 && bytes.toString('ascii', 0, 5) === '%PDF-'
}

/** GIF começa sempre com a assinatura GIF87a ou GIF89a. */
export function gifValido(bytes: Buffer): boolean {
  if (bytes.length < 6) return false
  const assinatura = bytes.toString('ascii', 0, 6)
  return assinatura === 'GIF87a' || assinatura === 'GIF89a'
}

/** Valida bytes e MIME declarado; SVG e formatos ativos nunca são aceitos. */
export function validarImagem(bytes: Buffer, mimeDeclarado: string): FormatoImagem {
  if (!bytes.length) throw new ImagemInvalidaError('Selecione uma imagem não vazia.')
  if (bytes.length > TAMANHO_MAXIMO_IMAGEM_BYTES) {
    throw new ImagemInvalidaError('Cada imagem pode ter no máximo 8 MB.')
  }

  let formato: FormatoImagem | null = null
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && bytes.toString('ascii', 12, 16) === 'IHDR') {
    formato = { mimeType: 'image/png', extensao: 'png' }
  } else if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    formato = { mimeType: 'image/jpeg', extensao: 'jpg' }
  } else if (bytes.length >= 16 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' && ['VP8 ', 'VP8L', 'VP8X'].includes(bytes.toString('ascii', 12, 16))) {
    formato = { mimeType: 'image/webp', extensao: 'webp' }
  }

  if (!formato || mimeDeclarado !== formato.mimeType) {
    throw new ImagemInvalidaError('Envie uma imagem PNG, JPEG ou WebP válida.')
  }
  return formato
}

export function chaveValida(chave: string): boolean {
  return CHAVE_VALIDA.test(chave)
}

function caminhoAbsoluto(chave: string): string {
  if (!chaveValida(chave)) throw new Error(`Chave de arquivo inválida: ${chave}`)
  return path.join(/*turbopackIgnore: true*/ diretorioBase(), chave)
}

export async function salvarPdf(sistemaSlug: string, bytes: Buffer): Promise<{ chave: string; tamanho: number }> {
  if (!SISTEMA_VALIDO.test(sistemaSlug)) throw new Error('Sistema inválido.')
  const chave = `${sistemaSlug}/${randomUUID()}.pdf`
  await gravarArquivo(chave, bytes, 'application/pdf')
  return { chave, tamanho: bytes.byteLength }
}

export async function salvarGif(sistemaSlug: string, bytes: Buffer): Promise<{ chave: string; tamanho: number }> {
  if (!SISTEMA_VALIDO.test(sistemaSlug)) throw new Error('Sistema inválido.')
  const chave = `${sistemaSlug}/${randomUUID()}.gif`
  await gravarArquivo(chave, bytes, 'image/gif')
  return { chave, tamanho: bytes.byteLength }
}

async function gravarArquivo(chave: string, bytes: Buffer, mimeType: string): Promise<void> {
  const bucket = bucketS3()
  if (bucket) {
    await s3().send(new PutObjectCommand({ Bucket: bucket, Key: chaveS3(chave), Body: bytes, ContentType: mimeType }))
    return
  }
  const destino = caminhoAbsoluto(chave)
  await mkdir(path.dirname(destino), { recursive: true })
  await writeFile(destino, bytes, { flag: 'wx' })
}

export async function salvarImagem(sistemaSlug: string, bytes: Buffer, mimeDeclarado: string): Promise<{ chave: string; tamanho: number; mimeType: FormatoImagem['mimeType'] }> {
  if (!SISTEMA_VALIDO.test(sistemaSlug)) throw new ImagemInvalidaError('Sistema inválido.')
  const formato = validarImagem(bytes, mimeDeclarado)
  const chave = `${sistemaSlug}/${randomUUID()}.${formato.extensao}`
  await gravarArquivo(chave, bytes, formato.mimeType)
  return { chave, tamanho: bytes.byteLength, mimeType: formato.mimeType }
}

export async function existeArquivo(chave: string): Promise<boolean> {
  if (await cabecalhoS3(chave)) return true
  try {
    await stat(/*turbopackIgnore: true*/ caminhoAbsoluto(chave))
    return true
  } catch {
    return false
  }
}

export async function tamanhoArquivo(chave: string): Promise<number> {
  const cabecalho = await cabecalhoS3(chave)
  if (cabecalho) {
    if (cabecalho.ContentLength === undefined) throw new Error(`Tamanho ausente no S3: ${chave}`)
    return cabecalho.ContentLength
  }
  const info = await stat(/*turbopackIgnore: true*/ caminhoAbsoluto(chave))
  return info.size
}

/** Stream, e não readFile: um PDF de 25 MB por leitor não pode virar 25 MB de heap. */
export async function streamArquivo(chave: string): Promise<NodeJS.ReadableStream> {
  const bucket = bucketS3()
  if (bucket && await cabecalhoS3(chave)) {
    const objeto = await s3().send(new GetObjectCommand({ Bucket: bucket, Key: chaveS3(chave) }))
    if (!objeto.Body) throw new Error(`Arquivo sem conteúdo no S3: ${chave}`)
    return objeto.Body as NodeJS.ReadableStream
  }
  return createReadStream(/*turbopackIgnore: true*/ caminhoAbsoluto(chave))
}

export async function removerArquivo(chave: string): Promise<void> {
  const bucket = bucketS3()
  if (bucket) await s3().send(new DeleteObjectCommand({ Bucket: bucket, Key: chaveS3(chave) }))
  try {
    await unlink(caminhoAbsoluto(chave))
  } catch {
    // arquivo já não existe — remover o registro do banco continua sendo o certo
  }
}
