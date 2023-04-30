import { type Order } from '@prisma/client'
import type GameUser from '../gameApi/user'
import * as log4js from 'log4js'

export async function sleep (time: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, time)
  })
}

export interface Executer {
  setup: () => Promise<void>
  work: () => Promise<void>
}

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
