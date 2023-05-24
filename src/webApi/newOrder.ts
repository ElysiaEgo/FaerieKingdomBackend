import { type ParameterizedContext } from 'koa'
import BaseWebApi from './base'
import GameUser from '../gameApi/user'
import { Worker } from '../executer/worker'
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
        type: ctx.request.body.type,
        itemId: ctx.request.body.itemId,
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
    let ord: Promise<void> | undefined
    if (ctx.request.body.type === 0) {
      ord = this.worker.addLoop(new GameUser(biliAcco.biliName, biliAcco.biliPass), order)
    } else if (ctx.request.body.type === 1) {
      ord = this.worker.addMaterial(new GameUser(biliAcco.biliName, biliAcco.biliPass), order)
    } else {
      this.resp(ctx, {}, {
        code: 100,
        message: 'not supported type'
      })
      return
    }
    ord?.catch((reason) => {
      console.log(`${order.biliId}'s order ${order.id} error`)
      console.log(reason)
    })
    this.resp(ctx, {})
  }
}
