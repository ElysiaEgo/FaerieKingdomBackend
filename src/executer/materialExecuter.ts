import { type Order } from '@prisma/client'
import type GameUser from '../gameApi/user'
import { BaseExecuter, sleep } from './base'
import { type StandardResponse } from '../gameApi/user'

// provide comments for MaterialExecuter with comprasion with loopExecuter

/**
 * 1. MaterialExecuter is a class that extends BaseExecuter.
 * 2. MaterialExecuter has 5 private properties:
 *    - questId: number
 *    - questPhase: number
 *    - num: number
 *    - useApple: boolean[]
 *    - itemId: number
 * 3. MaterialExecuter has 1 private property:
 *    - gained: number
 * 4. MaterialExecuter has 1 constructor:
 *    - constructor (user: GameUser, order: Order)
 * 5. MaterialExecuter has 1 method:
 *    - work: () => Promise<void>
 */
export class MaterialExecuter extends BaseExecuter {
  private readonly questId: number
  private readonly questPhase: number
  private readonly num: number
  private readonly useApple: boolean[]
  private readonly itemId: number
  private gained: number = 0

  constructor (user: GameUser, order: Order) {
    super(user, order)
    this.questId = order.questId
    this.questPhase = order.questPhase
    this.num = order.num
    this.itemId = order.itemId
    this.useApple = [order.goldapple, order.silverapple, order.copperapple, order.bronzeapple]
  }

  // need more test
  async work (): Promise<void> {
    for (; this.gained < this.num;) {
      const { followerId, followerClassId, followerSupportDeckId } = await this.getFollower()
      const battle = await this.setupBattle(followerId, followerClassId, followerSupportDeckId)
      const result = await this.finishBattle(battle)
      const items = result.response[0].success.resultDropInfos
      for (const item of items) {
        if (item.objectId === this.itemId) {
          this.gained++
        }
      }
    }
  }

  async getFollower (): Promise<{
    followerId: number
    followerClassId: number
    followerSupportDeckId: number
  }> {
    const followerList = await this.user.followerlist(this.questId)
    let followerId = 0
    let followerClassId = 0
    let followerSupportDeckId = 0
    for (const user of followerList.cache.updated.userFollower[0].followerInfo) {
      if (user.userSvtLeaderHash.length === 0) {
        continue
      }
      followerId = user.userId
      followerClassId = parseInt(user.userSvtLeaderHash[0].classId)
      followerSupportDeckId = parseInt(user.userSvtLeaderHash[0].supportDeckId)
    }
    if (followerId === 0) {
      throw new Error('无可选择的助战')
    }
    return { followerId, followerClassId, followerSupportDeckId }
  }

  async setupBattle (followerId: number, followerClassId: number, followerSupportDeckId: number): Promise<StandardResponse> {
    let battleSetup = await this.user.battlesetup(this.questId, this.questPhase, this.deckId, followerId, followerClassId, followerSupportDeckId)
    const testAP = (detail: string | undefined): boolean => detail?.includes('AP') ?? false
    if (testAP(battleSetup.response[0].fail.detail)) {
      for (let i = 0; i < this.useApple.length; i++) {
        if (this.useApple[i]) {
          await this.user.itemrecover(i + 2, 1)
          this.logger.debug(`${this.user.userId} recover AP with ${i + 2}`)
          battleSetup = await this.user.battlesetup(this.questId, this.questPhase, this.deckId, followerId, followerClassId, followerSupportDeckId)
          if (!testAP(battleSetup.response[0].fail.detail)) break
        }
      }
    }
    if (battleSetup.response[0].fail.detail !== undefined) {
      this.logger.debug(`${this.user.userId} cannot setup battle`)
      throw new Error(battleSetup.response[0].fail.detail)
    }
    return battleSetup
  }

  async finishBattle (battleSetup: StandardResponse): Promise<StandardResponse> {
    const battleId = parseInt(battleSetup.cache.replaced.battle[0].id)
    this.logger.debug(`${this.user.userId} setup battle ${battleId}`)
    await sleep(10000)
    const result = await this.user.battleresult(battleId)
    this.logger.debug(`${this.user.userId} finish battle ${battleId}`)
    return result
  }
}
