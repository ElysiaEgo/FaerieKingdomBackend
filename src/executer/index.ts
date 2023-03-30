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

  async setup (): Promise<void> {
    await this.user.getSdkCipher()
    await this.user.SdkLoginPassword()
    await this.user.loginToMemberCenter()
    await this.user.loginPhp()
    this.deckId = parseInt((await this.user.topLogin()).cache.replaced.userDeck[0].id)
  }

  abstract work (): Promise<void>
}

export class Worker {
  private readonly executers: Executer[] = []
  private readonly db: PrismaClient
  constructor (db: PrismaClient) {
    this.db = db
  }

  async add (user: GameUser, order: Order): Promise<void> {
    const loopExec = new LoopExecuter(user, order.questId, order.questPhase, order.num)
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
    })
  }
}

export class LoopExecuter extends BaseExecuter implements Executer {
  private readonly questId: number
  private readonly questPhase: number
  private readonly num: number
  private executed: number = 0

  constructor (user: GameUser, questId: number, questPhase: number, num: number) {
    super()
    this.user = user
    this.questId = questId
    this.questPhase = questPhase
    this.num = num
  }

  async work (): Promise<void> {
    for (; this.executed <= this.num; this.executed++) {
      const followerList = await this.user.followerlist(this.questId)
      const followerId = parseInt(followerList.cache.updated.userFollower[0].followerInfo[0].userSvtLeaderHash[0].userId)
      const followerClassId = parseInt(followerList.cache.updated.userFollower[0].followerInfo[0].userSvtLeaderHash[0].classId)
      const battleSetup = await this.user.battlesetup(this.questId, this.questPhase, this.deckId, followerId, followerClassId)
      const battleId = parseInt(battleSetup.cache.replaced.battle[0].id)
      console.log(`${this.user.userId} setup battle ${battleId}`)
      await sleep(10000)
      await this.user.battleresult(battleId)
      console.log(`${this.user.userId} finish battle ${battleId}`)
    }
  }
}
