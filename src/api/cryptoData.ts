import md5 from 'crypto-js/md5'
import { randomUUID } from 'crypto'
import RSA from 'jsrsasign'

const FUNNY_KEY = 'B5UI78B3486A7B48IB9AUF8E8P97CPI9'
const APP_KEY = 'a4e39619a09d49e9aead9b820980013a'

export function encryptMd5Usk (usk: string): string {
  const message = FUNNY_KEY + usk
  return md5(message).toString()
}

export function getBruvid (): string {
  const cipher = md5(randomUUID()).toString()
  return `XW${cipher[2]}${cipher[2]}${cipher[2]}${cipher}`
}

export function getBdId (): string {
  return `${randomUUID()}-${randomUUID()}`.slice(0, 64)
}

export function generateSign (params: Record<string, string>): string {
  const keys: string[] = []
  for (const key in params) keys.push(key)
  keys.sort()
  const vals: string[] = []
  for (const key of keys) vals.push(params[key])
  return md5(vals.join('') + APP_KEY).toString()
}

export function encryptPassword (pwd: string, cert: string): string {
  const key = RSA.KEYUTIL.getKey(cert) as RSA.RSAKey
  return Buffer.from(RSA.KJUR.crypto.Cipher.encrypt(pwd, key, 'RSA'), 'hex').toString('base64')
}
