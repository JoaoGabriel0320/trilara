import nodemailer from 'nodemailer'

function escaparHtml(valor: string) {
  return valor.replace(/[&<>"']/g, (caractere) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[caractere] ?? caractere)
}

export function montarEmailResetSenha(nome: string, link: string) {
  const nomeSeguro = escaparHtml(nome)
  const linkSeguro = escaparHtml(link)
  return {
    text: `Olá, ${nome}.\n\nRecebemos um pedido para redefinir sua senha na Trilara. Use este link em até 30 minutos:\n\n${link}\n\nSe você não fez esse pedido, ignore este e-mail. Sua senha atual continuará funcionando.\n\nTrilara · conhecimento conectado`,
    html: `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Redefinição de senha · Trilara</title></head>
<body style="margin:0;padding:32px 16px;background:#f4f3f7;font-family:Arial,Helvetica,sans-serif;color:#1f1d28">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="width:100%;max-width:560px;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #e8e7ed;border-radius:16px;overflow:hidden">
    <tr><td style="padding:30px 32px;background:#0b8b80;color:#ffffff;text-align:center;font-size:24px;font-weight:700">Trilara</td></tr>
    <tr><td style="padding:32px">
      <h1 style="margin:0 0 24px;font-size:21px;line-height:1.3;color:#0f0d18">Redefinição de senha</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6">Olá, ${nomeSeguro}.</p>
      <p style="margin:0 0 26px;font-size:15px;line-height:1.6">Recebemos um pedido para redefinir sua senha na Trilara. O link abaixo é válido por <strong>30 minutos</strong> e pode ser usado uma vez.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="border-radius:10px;background:#0b8b80;text-align:center"><a href="${linkSeguro}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700">Redefinir minha senha</a></td></tr></table>
      <p style="margin:30px 0 8px;font-size:13px;line-height:1.5;color:#6b6878">Se o botão não abrir, copie este endereço no navegador:</p>
      <p style="margin:0 0 26px;font-size:13px;line-height:1.6;overflow-wrap:anywhere;word-break:break-all"><a href="${linkSeguro}" style="color:#0b8b80;text-decoration:underline">${linkSeguro}</a></p>
      <p style="margin:0;padding-top:22px;border-top:1px solid #e8e7ed;font-size:13px;line-height:1.6;color:#6b6878">Se você não fez esse pedido, ignore este e-mail. Sua senha atual continuará funcionando.</p>
    </td></tr>
  </table>
  <p style="margin:20px auto 0;max-width:560px;text-align:center;font-size:12px;color:#9694a3">Trilara · conhecimento conectado</p>
</body></html>`,
  }
}

export function urlBaseResetValida(valor: string, producao: boolean) {
  try {
    const url = new URL(valor)
    if (url.username || url.password) return false
    if (url.protocol === 'https:') return true
    if (producao || url.protocol !== 'http:') return false
    if (url.hostname === 'localhost' || url.hostname === '[::1]') return true
    const octetos = url.hostname.split('.').map(Number)
    if (octetos.length !== 4 || octetos.some((parte) => !Number.isInteger(parte) || parte < 0 || parte > 255)) return false
    return octetos[0] === 127 || octetos[0] === 10
      || (octetos[0] === 172 && octetos[1] >= 16 && octetos[1] <= 31)
      || (octetos[0] === 192 && octetos[1] === 168)
  } catch { return false }
}

export function emailResetConfigurado() {
  const porta = Number(process.env.SMTP_PORT)
  return Boolean(
    process.env.SMTP_SERVER
    && process.env.SMTP_USERNAME
    && process.env.SMTP_PASSWORD
    && process.env.RESET_EMAIL_FROM
    && process.env.RESET_BASE_URL
    && /^\d+$/.test(process.env.SMTP_PORT ?? '')
    && Number.isInteger(porta) && porta > 0 && porta <= 65535
    && urlBaseResetValida(process.env.RESET_BASE_URL, process.env.NODE_ENV === 'production'),
  )
}

export async function enviarEmailResetSenha(destinatario: string, nome: string, token: string) {
  const servidor = process.env.SMTP_SERVER
  const usuario = process.env.SMTP_USERNAME
  const senha = process.env.SMTP_PASSWORD
  const porta = Number(process.env.SMTP_PORT)
  const remetente = process.env.RESET_EMAIL_FROM
  const baseUrl = process.env.RESET_BASE_URL

  if (!emailResetConfigurado() || !servidor || !usuario || !senha || !remetente || !baseUrl) {
    throw new Error('Envio de e-mail de redefinição não configurado.')
  }

  const urlBase = new URL(baseUrl)
  const link = new URL('/redefinir-senha', urlBase)
  link.searchParams.set('token', token)
  const conteudo = montarEmailResetSenha(nome, link.toString())

  const transporte = nodemailer.createTransport({
    host: servidor,
    port: porta,
    secure: porta === 465,
    requireTLS: porta !== 465,
    auth: { user: usuario, pass: senha },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  })
  try {
    await transporte.sendMail({
      from: remetente,
      to: destinatario,
      subject: 'Redefinição de senha · Trilara',
      ...conteudo,
    })
  } finally {
    transporte.close()
  }
}
