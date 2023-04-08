import { type ParameterizedContext } from 'koa'
import BaseWebApi from './base'

export class QueryOrderApi extends BaseWebApi {
  handle = async (ctx: ParameterizedContext): Promise<void> => {
    const orders = await this.db.user.findUnique({
      where: {
        id: ctx.state.user?.id
      }
    }).orders()
    this.resp(ctx, {
      orders: orders?.map((value) => {
        return {
          finish: value.finished,
          questId: value.questId,
          questPhase: value.questPhase,
          num: value.num,
          message: value.message,
          biliId: value.biliId
        }
      })
    })
  }
}
