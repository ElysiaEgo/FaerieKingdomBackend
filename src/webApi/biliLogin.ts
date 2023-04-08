import { type ParameterizedContext } from 'koa'
import BaseWebApi from './base'
import GameUser from '../gameApi/user'

export class BiliLoginApi extends BaseWebApi {
  handle = async (ctx: ParameterizedContext): Promise<void> => {
    const acco = await this.db.biliAcco.findUnique({
      where: {
        biliName: ctx.request.body.biliname
      }
    })
    if (acco !== null) {
      this.resp(ctx, {}, {
        code: 200,
        message: 'no such bili acco'
      })
      return
    }
    const player = new GameUser(ctx.request.body.biliname, ctx.request.body.bilipass, ctx.request.body.isios)
    try {
      await player.getSdkCipher()
      await player.SdkLoginPassword()
      await player.loginToMemberCenter()
      await player.loginPhp()
      await player.home()
      await this.db.user.update({
        where: {
          id: ctx.state.user.id
        },
        data: {
          biliAccos: {
            create: {
              biliName: ctx.request.body.biliname,
              biliPass: ctx.request.body.bilipass,
              biliId: player.userId.toString(),
              isIOS: ctx.request.body.isios
            }
          }
        }
      })
      this.resp(ctx, {})
    } catch (e) {
      console.log(e)
      this.resp(ctx, {}, {
        code: 200,
        message: (e as any).message
      })
    }
  }
}
