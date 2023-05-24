import { type PrismaClient } from '@prisma/client'
import { type ParameterizedContext } from 'koa'

interface ApiHandle {
  handle: (ctx: ParameterizedContext) => any
}

/**
 * @abstract
 * @class BaseWebApi
 * @implements {ApiHandle}
 */
export default abstract class BaseWebApi implements ApiHandle {
  protected db: PrismaClient
  constructor (db: PrismaClient) {
    this.db = db
  }

  abstract handle: (ctx: ParameterizedContext) => any

  protected resp (ctx: ParameterizedContext, data: any, error?: { code: number, message: string }): void {
    ctx.type = 'json'
    Object.defineProperty(data, 'code', {
      value: error?.code ?? 0,
      enumerable: true
    })
    Object.defineProperty(data, 'message', {
      value: error?.message ?? '',
      enumerable: true
    })
    ctx.body = data
  }
}
