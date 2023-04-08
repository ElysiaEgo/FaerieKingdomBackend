import { type ParameterizedContext } from 'koa'
import BaseWebApi from './base'

export class ProfileApi extends BaseWebApi {
  handle = async (ctx: ParameterizedContext): Promise<void> => {
    const biliAccos = await this.db.user.findUnique({
      where: {
        id: ctx.state.user.id
      }
    }).biliAccos()
    this.resp(ctx, {
      biliAccos: biliAccos?.map((value) => {
        return {
          name: value.biliName,
          id: value.biliId.toString(),
          isios: value.isIOS
        }
      })
    })
  }
}
