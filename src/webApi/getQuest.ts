import { type ParameterizedContext } from 'koa'
import BaseWebApi from './base'
import GameUser from '../gameApi/user'

export class GetQuestApi extends BaseWebApi {
  handle = async (ctx: ParameterizedContext): Promise<void> => {
    const biliAcco = await this.db.user.findUnique({
      where: {
        id: ctx.state.user.id
      }
    }).biliAccos({
      where: {
        biliId: ctx.request.body.biliId.toString()
      }
    })
    if (biliAcco === null) return
    const player = new GameUser(biliAcco[0].biliName, biliAcco[0].biliPass)
    await player.getSdkCipher()
    await player.SdkLoginPassword()
    await player.loginToMemberCenter()
    await player.loginPhp()
    const loginResult = await player.topLogin()
    this.resp(ctx, {
      quests: loginResult.cache.replaced.userQuest.map((value: { questId: string, questPhase: string, challengeNum: string }) => {
        return {
          questId: value.questId,
          questPhase: value.questPhase,
          challengeNum: value.challengeNum
        }
      })
    })
  }
}
