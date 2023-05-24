import { type PrismaClient, type Order } from '@prisma/client'
import type GameUser from '../gameApi/user'
import { LoopExecuter } from './loopExecuter'
import { type Executer } from './base'
import * as log4js from 'log4js'
import { MaterialExecuter } from './materialExecuter'

/**
 * 1. Worker is a class that has 2 private properties:
 *    - executers: Executer[]
 *    - db: PrismaClient
 * 2. Worker has 1 private property:
 *    - logger: log4js.Logger
 * 3. Worker has 1 constructor:
 *    - constructor (db: PrismaClient)
 * 4. Worker has 2 methods:
 *    - addLoop: (user: GameUser, order: Order) => Promise<void>
 *    - addMaterial: (user: GameUser, order: Order) => Promise<void>
 */
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

  async addMaterial (user: GameUser, order: Order): Promise<void> {
    const materialExec = new MaterialExecuter(user, order)
    await materialExec.setup()
    const ind = this.executers.push(materialExec) - 1
    void materialExec.work().then(async (_) => {
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
