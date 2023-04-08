import { type ParameterizedContext } from 'koa'
import BaseWebApi from './base'
import fs from 'fs'
import path from 'path'

const assets = new Map<string, string>()
fs.readdirSync(path.join(__dirname, '../gameAssets')).forEach((value) => {
  if (value.endsWith('.json')) {
    // serializing to minify response
    assets.set(value.replace('.json', ''), JSON.stringify(JSON.parse(fs.readFileSync(path.join(__dirname, '../gameAssets', value)).toString())))
  }
})

export class GameAssetsApi extends BaseWebApi {
  handle = async (ctx: ParameterizedContext): Promise<void> => {
    if (assets.has(ctx.params.name)) {
      this.resp(ctx, {
        data: assets.get(ctx.params.name)
      })
    } else {
      this.resp(ctx, {
        data: null
      }, {
        code: 100,
        message: 'no such asset'
      })
    }
  }
}
