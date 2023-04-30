import { type ParameterizedContext } from 'koa'
import BaseWebApi from './base'
import { Worker } from '../executer/worker'
import { type PrismaClient } from '@prisma/client'

export class DeletaOrderApi extends BaseWebApi {
  worker: Worker
  constructor (db: PrismaClient) {
    super(db)
    this.worker = new Worker(db)
  }

  handle = async (ctx: ParameterizedContext): Promise<void> => {
    await this.db.order.delete({
      where: {
        id: ctx.request.body.id
      }
    })
    this.resp(ctx, {})
  }
}
