import { type ParameterizedContext } from 'koa'
import BaseWebApi from './base'
import jwt from 'jsonwebtoken'

import dotenv from 'dotenv'

const env = dotenv.config()
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const SECRET_KEY = env.parsed!.JWT_SECRETKEY

export class LoginApi extends BaseWebApi {
  handle = async (ctx: ParameterizedContext): Promise<void> => {
    const user = await this.db.user.findUnique({
      where: {
        name: ctx.request.body.uname
      }
    })
    if (user === null || user.password !== ctx.request.body.passwd) {
      ctx.response.status = 403
      this.resp(ctx, {
        token: '',
        userid: 0
      }, {
        code: 100,
        message: '账户或密码错误'
      })
    } else {
      const token = jwt.sign({
        id: user.id,
        name: user.name,
        pass: user.password
      }, SECRET_KEY, { expiresIn: '1d' })
      this.resp(ctx, {
        token,
        userid: user.id
      })
    }
  }
}
