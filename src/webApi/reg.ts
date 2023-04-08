import { type ParameterizedContext } from 'koa'
import BaseWebApi from './base'

export class RegApi extends BaseWebApi {
  handle = async (ctx: ParameterizedContext): Promise<void> => {
    const user = await this.db.user.findUnique({
      where: {
        name: ctx.request.body.uname
      }
    })
    if (ctx.request.body.uname.length < 8 || ctx.request.body.passwd.length < 8) {
      this.resp(ctx, {}, {
        code: 100,
        message: '账号密码需要大于等于八位字符'
      })
    } else if (user !== null) {
      this.resp(ctx, {}, {
        code: 100,
        message: '账号已被注册'
      })
    } else {
      await this.db.user.create({
        data: {
          name: ctx.request.body.uname,
          password: ctx.request.body.passwd
        }
      })
      this.resp(ctx, {})
    }
  }
}
