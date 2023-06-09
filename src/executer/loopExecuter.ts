import { type Order } from '@prisma/client'
import type GameUser from '../gameApi/user'
import { BaseExecuter, sleep } from './base'
import { type StandardResponse } from '../gameApi/user'

/**
 * 1. LoopExecuter is a class that extends BaseExecuter.
 * 2. LoopExecuter has 4 private properties:
 *    - questId: number
 *    - questPhase: number
 *    - num: number
 *    - useApple: boolean[]
 * 3. LoopExecuter has 1 private property:
 *    - executed: number
 * 4. LoopExecuter has 1 constructor:
 *    - constructor (user: GameUser, order: Order)
 * 5. LoopExecuter has 1 async method:
 *    - work: () => Promise<void>
 * 6. LoopExecuter has 3 private async methods:
 *    - getFollower: () => Promise<{
 *        followerId: number
 *        followerClassId: number
 *        followerSupportDeckId: number
 *      }>
 *    - setupBattle: (followerId: number, followerClassId: number, followerSupportDeckId: number) => Promise<StandardResponse>
 *    - finishBattle: (battleSetup: StandardResponse) => Promise<StandardResponse>
 */
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

  /**
   * 1. LoopExecuter.work() is an async function.
   * 2. LoopExecuter.work() has no parameter.
   * 3. LoopExecuter.work() will return a Promise that will be resolved after all battles are finished.
   * 4. LoopExecuter.work() will do the following things:
   *    - Get followerId, followerClassId, followerSupportDeckId.
   *    - Setup battle with followerId, followerClassId, followerSupportDeckId.
   *    - Finish battle.
   * @returns A Promise that will be resolved after all battles are finished.
   */
  async work (): Promise<void> {
    for (; this.executed < this.num; this.executed++) {
      const { followerId, followerClassId, followerSupportDeckId } = await this.getFollower()
      const battle = await this.setupBattle(followerId, followerClassId, followerSupportDeckId)
      const result = await this.finishBattle(battle)
      this.logger.debug(JSON.stringify(result, null, 2))
    }
  }

  /**
   * Get followerId, followerClassId, followerSupportDeckId
   * @returns followerId, followerClassId, followerSupportDeckId
   */
  private async getFollower (): Promise<{
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

  /**
   * Setup battle with followerId, followerClassId, followerSupportDeckId
   * @param followerId
   * @param followerClassId
   * @param followerSupportDeckId
   * @returns
   */
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

  /**
   * Finish battle with battleSetup
   * @param battleSetup
   * @returns
   */
  async finishBattle (battleSetup: StandardResponse): Promise<StandardResponse> {
    const battleId = parseInt(battleSetup.cache.replaced.battle[0].id)
    this.logger.debug(`${this.user.userId} setup battle ${battleId}`)
    await sleep(10000)
    const result = await this.user.battleresult(battleId)
    this.logger.debug(`${this.user.userId} finish battle ${battleId}`)
    return result
  }
}
