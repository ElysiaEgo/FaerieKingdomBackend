import { type Order } from '@prisma/client'
import type GameUser from '../gameApi/user'
import * as log4js from 'log4js'

/**
 * 1. sleep is a function that returns a Promise.
 * 2. sleep has 1 parameter:
 *   - time: number
 * 3. sleep will return a Promise that will be resolved after time milliseconds.
 * @param time - The time to sleep in milliseconds.
 * @returns A Promise that will be resolved after time milliseconds.
 */
export async function sleep (time: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, time)
  })
}

export interface Executer {
  setup: () => Promise<void>
  work: () => Promise<void>
}

/**
 * 1. BaseExecuter is the base class of all executers.
 * 2. BaseExecuter is an abstract class.
 * 3. BaseExecuter has 3 protected properties:
 *    - user: GameUser
 *    - order: Order
 *    - deckId: number
 *    - logger: log4js.Logger
 * 4. BaseExecuter has 2 abstract methods:
 *    - setup: () => Promise<void>
 *    - work: () => Promise<void>
 * 5. BaseExecuter has 1 getter:
 *    - id: number
 * 6. BaseExecuter has 1 static method:
 *    - sleep: (time: number) => Promise<void>
 */
export abstract class BaseExecuter implements Executer {
  protected user: GameUser
  protected order: Order
  protected deckId = 0
  protected logger = log4js.getLogger()

  protected constructor (user: GameUser, order: Order) {
    this.user = user
    this.order = order
  }

  get id (): number {
    return this.order.id
  }

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
