import { type ParameterizedContext } from 'koa'
import BaseWebApi from './base'
import GameUser from '../gameApi/user'
import { Worker } from '../executer'
import { type PrismaClient } from '@prisma/client'

export class NewOrderApi extends BaseWebApi {
  worker: Worker
  constructor (db: PrismaClient) {
    super(db)
    this.worker = new Worker(db)
  }

  handle = async (ctx: ParameterizedContext): Promise<void> => {
    const user = await this.db.user.findUnique({
      where: {
        id: ctx.state.user.id
      }
    })
    const biliAcco = await this.db.biliAcco.findUnique({
      where: {
        biliId: ctx.request.body.biliId.toString()
      }
    })
    if (user === null || biliAcco === null) return
    const order = await this.db.order.create({
      data: {
        questId: ctx.request.body.questId,
        questPhase: ctx.request.body.questPhase,
        num: ctx.request.body.num,
        biliId: biliAcco.biliId.toString(),
        goldapple: ctx.request.body.useApple[0],
        silverapple: ctx.request.body.useApple[1],
        copperapple: ctx.request.body.useApple[2],
        bronzeapple: ctx.request.body.useApple[3],
        creator: {
          connect: {
            id: user.id
          }
        }
      }
    })
    void this.worker.addLoop(new GameUser(biliAcco.biliName, biliAcco.biliPass), order).catch((reason) => {
      console.log(`${order.biliId}'s order ${order.id} error`)
      console.log(reason)
    })
    this.resp(ctx, {})
  }
}
