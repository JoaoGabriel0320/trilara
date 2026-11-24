// src/lib/auth/index.ts
//
// Fachada para uso em código server-side (Node). O middleware NÃO importa daqui:
// ele importa '@/lib/auth/jwt' direto, para não arrastar next/headers pro Edge.

export * from './jwt'
export * from './session'
