import { type Order } from '@prisma/client'
import type GameUser from '../gameApi/user'
import { BaseExecuter, sleep } from './base'

export class LoopExecuter extends BaseExecuter {
  private readonly questId: number
  private readonly questPhase: number
  private readonly num: number
  private readonly useApple: boolean[]
  private executed: number = 0

  constructor (user: GameUser, order: Order) {
    super(user, order)
    this.questId = order.questId
    this.questPhase = order.questPhase
    this.num = order.num
    this.useApple = [order.goldapple, order.silverapple, order.copperapple, order.bronzeapple]
  }

  async work (): Promise<void> {
    for (; this.executed < this.num; this.executed++) {
      const followerList = await this.user.followerlist(this.questId)
      const followerId = parseInt(followerList.cache.updated.userFollower[0].followerInfo[0].userSvtLeaderHash[0].userId)
      const followerClassId = parseInt(followerList.cache.updated.userFollower[0].followerInfo[0].userSvtLeaderHash[0].classId)
      let battleSetup = await this.user.battlesetup(this.questId, this.questPhase, this.deckId, followerId, followerClassId)
      const testAP = (detail: string | undefined): boolean => detail?.includes('AP') ?? false
      if (testAP(battleSetup.response[0].fail.detail)) {
        for (let i = 0; i < this.useApple.length; i++) {
          if (this.useApple[i]) {
            await this.user.itemrecover(i + 2, 1)
            this.logger.debug(`${this.user.userId} recover AP with ${i + 2}`)
            battleSetup = await this.user.battlesetup(this.questId, this.questPhase, this.deckId, followerId, followerClassId)
            if (!testAP(battleSetup.response[0].fail.detail)) break
          }
        }
      }
      if (battleSetup.response[0].fail.detail !== undefined) {
        this.logger.debug(`${this.user.userId} cannot setup battle`)
        throw new Error(battleSetup.response[0].fail.detail)
      }
      const battleId = parseInt(battleSetup.cache.replaced.battle[0].id)
      this.logger.debug(`${this.user.userId} setup battle ${battleId}`)
      await sleep(10000)
      await this.user.battleresult(battleId)
      this.logger.debug(`${this.user.userId} finish battle ${battleId}`)
    }
  }
}
