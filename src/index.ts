import { PrismaClient } from '@prisma/client'
import Koa from 'koa'
import Router from 'koa-router'
import json from 'koa-json'
import koaJwt from 'koa-jwt'
import bodyparser from 'koa-body'
import { ApiFactory } from './webApi'
import dotenv from 'dotenv'
import * as log4js from 'log4js'
import cors from '@koa/cors'

const prisma = new PrismaClient()

log4js.configure({
  appenders: {
    executer: {
      type: 'file',
      filename: 'executor.log'
    },
    worker: {
      type: 'file',
      filename: 'worker.log'
    }
  },
  categories: {
    default: {
      appenders: ['executer'],
      level: 'debug'
    },
    worker: {
      appenders: ['worker'],
      level: 'debug'
    }
  }
});

(async () => {
  const env = dotenv.config()

  const app = new Koa()
  const router = new Router()
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const secretKey = env.parsed!.JWT_SECRETKEY
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const port = parseInt(env.parsed!.PORT)

  app.use(bodyparser())
  app.use(json())
  app.use(cors({
    origin: (ctx) => {
      if (ctx.url.startsWith('https://fate.elysiaego.top')) {
        return 'https://fate.elysiaego.top'
      }
      return 'https://beta.elysiaego.top'
    }
  }))

  app.use(koaJwt({
    secret: secretKey,
    algorithms: ['HS256'],
    getToken: (ctx) => {
      try {
        return ctx.request.body.token
      } catch (_) {
        return null
      }
    }
  }).unless({
    path: ['/reg', '/login']
  }))

  const api = new ApiFactory(prisma)

  router.post('/reg', api.Reg.handle)
  router.post('/login', api.Login.handle)

  router.post('/biliLogin', api.BiliLogin.handle)

  router.post('/profile', api.Profile.handle)

  // router.post('/getQuest', api.GetQuest.handle)

  router.post('/newOrder', api.NewOrder.handle)
  router.post('/queryOrder', api.QueryOrder.handle)

  router.post('/gameAssets/:name', api.GameAssets.handle)

  app.use(router.routes())
  app.use(router.allowedMethods())

  app.use(async (ctx, next) => {
    return await next().catch((err) => {
      if (err.status === 401) {
        ctx.status = 401
        ctx.body = 'Protected resource, check your authorization\n'
      } else {
        throw err
      }
    })
  })

  app.listen(port, () => {
    console.log('FaerieKingdom V0.3.2')
    console.log('Powered by Koa & Vue')
  })
})().then(async () => {
  await prisma.$disconnect()
}).catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
