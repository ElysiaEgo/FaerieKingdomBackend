import { type PrismaClient, type Order } from '@prisma/client'
import type GameUser from '../api/user'
import * as log4js from 'log4js'

log4js.configure({
  appenders: {
    executer: {
      type: 'file',
      filename: 'executor.log'
    }
  },
  categories: {
    default: {
      appenders: ['executer'],
      level: 'debug'
    }
  }
})

const logger = log4js.getLogger()
logger.level = 'debug'

async function sleep (time: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, time)
  })
}

interface Executer {
  setup: () => Promise<void>
  work: () => Promise<void>
}

abstract class BaseExecuter {
  protected user!: GameUser
  protected deckId = 0

  async setup (): Promise<void> {
    await this.user.getSdkCipher()
    await this.user.SdkLoginPassword()
    await this.user.loginToMemberCenter()
    await this.user.loginPhp()
    const loginInfo = await this.user.topLogin()
    this.deckId = parseInt(loginInfo.cache.replaced.userDeck[0].id)
  }

  abstract work (): Promise<void>
}

export class Worker {
  private readonly executers: Executer[] = []
  private readonly db: PrismaClient
  constructor (db: PrismaClient) {
    this.db = db
  }

  async addLoop (user: GameUser, order: Order): Promise<void> {
    const loopExec = new LoopExecuter(user, order.questId, order.questPhase, order.num, [order.goldapple, order.silverapple, order.copperapple, order.bronzeapple])
    await loopExec.setup()
    const loc = this.executers.push(loopExec) - 1
    void loopExec.work().then(async (_) => {
      this.executers.splice(loc, 1)
      logger.debug(`${order.biliId}'s order ${order.id} finished`)
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
      logger.debug(`${order.biliId}'s order ${order.id} error`)
      logger.debug(reason)
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

export class LoopExecuter extends BaseExecuter implements Executer {
  private readonly questId: number
  private readonly questPhase: number
  private readonly num: number
  private readonly useApple: boolean[]
  private executed: number = 0

  constructor (user: GameUser, questId: number, questPhase: number, num: number, useApple: boolean[]) {
    super()
    this.user = user
    this.questId = questId
    this.questPhase = questPhase
    this.num = num
    this.useApple = useApple
  }

  async work (): Promise<void> {
    for (; this.executed < this.num; this.executed++) {
      const followerList = await this.user.followerlist(this.questId)
      const followerId = parseInt(followerList.cache.updated.userFollower[0].followerInfo[0].userSvtLeaderHash[0].userId)
      const followerClassId = parseInt(followerList.cache.updated.userFollower[0].followerInfo[0].userSvtLeaderHash[0].classId)
      let battleSetup = await this.user.battlesetup(this.questId, this.questPhase, this.deckId, followerId, followerClassId)
      if (battleSetup.response[0].fail.detail !== undefined && (battleSetup.response[0].fail.detail as string).includes('AP')) {
        for (let i = 0; i < this.useApple.length; i++) {
          if (this.useApple[i]) {
            await this.user.itemrecover(i + 2, 1)
            logger.debug(`${this.user.userId} recover AP with ${i + 2}`)
            battleSetup = await this.user.battlesetup(this.questId, this.questPhase, this.deckId, followerId, followerClassId)
            if (battleSetup.response[0].fail.detail === undefined || !(battleSetup.response[0].fail.detail as string).includes('AP')) break
          }
        }
      }
      if (battleSetup.response[0].fail.detail !== undefined) {
        logger.debug(`${this.user.userId} cannot setup battle`)
        throw new Error(battleSetup.response[0].fail.detail)
      }
      const battleId = parseInt(battleSetup.cache.replaced.battle[0].id)
      logger.debug(`${this.user.userId} setup battle ${battleId}`)
      await sleep(10000)
      await this.user.battleresult(battleId)
      logger.debug(`${this.user.userId} finish battle ${battleId}`)
    }
  }
}
