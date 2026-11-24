// Recursos pausados continuam no código e nos dados. Mude para true para reativar
// o assistente depois de revisar a experiência e os provedores de IA.
export const ASSISTENTE_ATIVO = false

// Na Vercel, o projeto apresenta apenas a demonstração pública.
// O portal completo continua disponível no ambiente local.
export const SITE_PUBLICO = process.env.VERCEL === '1' || process.env.TRILARA_SITE_PUBLICO === 'true'
