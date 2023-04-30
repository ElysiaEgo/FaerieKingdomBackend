import { type PrismaClient, type Order } from '@prisma/client'
import type GameUser from '../gameApi/user'
import { LoopExecuter } from './loopExecuter'
import { type Executer } from './base'
import * as log4js from 'log4js'

export class Worker {
  private readonly executers: Executer[] = []
  private readonly db: PrismaClient
  private readonly logger = log4js.getLogger('worker')
  constructor (db: PrismaClient) {
    this.db = db
  }

  async addLoop (user: GameUser, order: Order): Promise<void> {
    const loopExec = new LoopExecuter(user, order)
    await loopExec.setup()
    const ind = this.executers.push(loopExec) - 1
    void loopExec.work().then(async (_) => {
      this.executers.splice(ind, 1)
      this.logger.debug(`${order.biliId}'s order ${order.id} finished`)
      return await this.db.order.update({
        where: {
          id: order.id
        },
        data: {
          finished: true,
          message: 'finished'
        }
      })
    }).catch(async (reason) => {
      this.logger.debug(`${order.biliId}'s order ${order.id} error`)
      this.logger.debug(reason)
      return await this.db.order.update({
        where: {
          id: order.id
        },
        data: {
          finished: true,
          message: reason.message
        }
      })
    })
  }
}
