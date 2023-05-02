import { type ParameterizedContext } from 'koa'
import BaseWebApi from './base'
import fs from 'fs'
import path from 'path'

const assets = new Map<string, string>()
const gameAssetsPath = '../gameAssets/dump'
fs.readdirSync(path.join(__dirname, gameAssetsPath)).forEach((value) => {
  if (value.endsWith('.json')) {
    // re-serializing to minify response
    assets.set(value.replace('.json', '').replace('Entity', ''), JSON.stringify(JSON.parse(fs.readFileSync(path.join(__dirname, gameAssetsPath, value)).toString())))
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
