import { type PrismaClient, type Order } from '@prisma/client'
import type GameUser from '../api/user'

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
  protected ap = 0

  async setup (): Promise<void> {
    await this.user.getSdkCipher()
    await this.user.SdkLoginPassword()
    await this.user.loginToMemberCenter()
    await this.user.loginPhp()
    const loginInfo = await this.user.topLogin()
    this.deckId = parseInt(loginInfo.cache.replaced.userDeck[0].id)
    const actMax = parseInt(loginInfo.cache.replaced.userGame[0].actMax)
    const recoverAt = parseInt(loginInfo.cache.replaced.userGame[0].actRecoverAt)
    this.updateAp(actMax, recoverAt)
  }

  updateAp (max: number, recoverAt: number): void {
    const now = Math.floor(new Date().getTime() / 1000)
    this.ap = max - Math.ceil((recoverAt - now) / 3600 / 5)
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
    const loopExec = new LoopExecuter(user, order.questId, order.questPhase, order.num, order.goldapple)
    await loopExec.setup()
    const loc = this.executers.push(loopExec) - 1
    void loopExec.work().then(async (_) => {
      this.executers.splice(loc, 1)
      console.log(`${order.biliId}'s order ${order.id} finished`)
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
      console.log(`${order.biliId}'s order ${order.id} error`)
      console.log(reason)
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
  private readonly goldApple: boolean
  private executed: number = 0

  constructor (user: GameUser, questId: number, questPhase: number, num: number, goldApple: boolean) {
    super()
    this.user = user
    this.questId = questId
    this.questPhase = questPhase
    this.num = num
    this.goldApple = goldApple
  }

  async work (): Promise<void> {
    for (; this.executed < this.num; this.executed++) {
      const followerList = await this.user.followerlist(this.questId)
      const followerId = parseInt(followerList.cache.updated.userFollower[0].followerInfo[0].userSvtLeaderHash[0].userId)
      const followerClassId = parseInt(followerList.cache.updated.userFollower[0].followerInfo[0].userSvtLeaderHash[0].classId)
      let battleSetup = await this.user.battlesetup(this.questId, this.questPhase, this.deckId, followerId, followerClassId)
      if (battleSetup.response[0].fail.detail !== undefined && (battleSetup.response[0].fail.detail as string).includes('AP')) {
        if (this.goldApple) {
          // gola apple for 1
          await this.user.itemrecover(2, 1)
          battleSetup = await this.user.battlesetup(this.questId, this.questPhase, this.deckId, followerId, followerClassId)
        } else {
          console.log(`${this.user.userId} cannot setup battle because of lack of AP`)
          throw new Error('not enough AP')
        }
      }
      const actMax = parseInt(battleSetup.cache.updated.userGame[0].actMax)
      const recoverAt = parseInt(battleSetup.cache.updated.userGame[0].actRecoverAt)
      this.updateAp(actMax, recoverAt)
      const battleId = parseInt(battleSetup.cache.replaced.battle[0].id)
      console.log(`${this.user.userId} setup battle ${battleId}`)
      await sleep(10000)
      await this.user.battleresult(battleId)
      console.log(`${this.user.userId} finish battle ${battleId}`)
    }
  }
}
