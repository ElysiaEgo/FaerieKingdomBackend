import { type PrismaClient } from '@prisma/client'
import { RegApi } from './reg'
import { LoginApi } from './login'
import { BiliLoginApi } from './biliLogin'
import { ProfileApi } from './profile'
import { GetQuestApi } from './getQuest'
import { NewOrderApi } from './newOrder'
import { QueryOrderApi } from './queryOrder'
import { GameAssetsApi } from './gameAssets'

export class ApiFactory {
  Reg: RegApi
  Login: LoginApi
  BiliLogin: BiliLoginApi
  Profile: ProfileApi
  GetQuest: GetQuestApi
  NewOrder: NewOrderApi
  QueryOrder: QueryOrderApi
  GameAssets: GameAssetsApi

  constructor (db: PrismaClient) {
    this.Reg = new RegApi(db)
    this.Login = new LoginApi(db)
    this.BiliLogin = new BiliLoginApi(db)
    this.Profile = new ProfileApi(db)
    this.GetQuest = new GetQuestApi(db)
    this.NewOrder = new NewOrderApi(db)
    this.QueryOrder = new QueryOrderApi(db)
    this.GameAssets = new GameAssetsApi(db)
  }
}
