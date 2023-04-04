import { PrismaClient } from '@prisma/client'
import Koa from 'koa'
import Router from 'koa-router'
import json from 'koa-json'
import koaJwt from 'koa-jwt'
import bodyparser from 'koa-body'
import jwt from 'jsonwebtoken'
import GameUser from './api/user'
import { Worker } from './executer'

const prisma = new PrismaClient()
const app = new Koa()
const router = new Router()
const secretKey = 'FaerieKingdomByElysiaEgo@2023'
const port = 9898
const worker = new Worker(prisma);

(async () => {
  app.use(bodyparser())
  app.use(json())

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

  router.post('/reg', async (ctx) => {
    const user = await prisma.user.findUnique({
      where: {
        name: ctx.request.body.uname
      }
    })
    if (ctx.request.body.uname.length < 8 || ctx.request.body.passwd.length < 8) {
      ctx.type = 'json'
      ctx.body = {
        code: 100
      }
    } else if (user !== null) {
      ctx.type = 'json'
      ctx.body = {
        code: 100
      }
    } else {
      await prisma.user.create({
        data: {
          name: ctx.request.body.uname,
          password: ctx.request.body.passwd
        }
      })
      ctx.type = 'json'
      ctx.body = {
        code: 0
      }
    }
  }).post('/login', async (ctx) => {
    const user = await prisma.user.findUnique({
      where: {
        name: ctx.request.body.uname
      }
    })
    if (user === null || user.password !== ctx.request.body.passwd) {
      ctx.response.status = 403
      ctx.type = 'type'
      ctx.body = {
        code: 100,
        token: '',
        userid: 0
      }
    } else {
      const token = jwt.sign({
        id: user.id,
        name: user.name,
        pass: user.password
      }, secretKey, { expiresIn: '1d' })
      ctx.type = 'type'
      ctx.body = {
        code: 0,
        token,
        userid: user.id
      }
    }
  })

  router.post('/bili_login', async (ctx) => {
    const acco = await prisma.biliAcco.findUnique({
      where: {
        biliName: ctx.request.body.biliname
      }
    })
    if (acco !== null) {
      ctx.type = 'json'
      ctx.body = {
        code: 200
      }
      return
    }
    const player = new GameUser(ctx.request.body.biliname, ctx.request.body.bilipass, ctx.request.body.isios)
    await player.getSdkCipher().then(async (_) => {
      return await player.SdkLoginPassword()
    }).then(async (_) => {
      return await player.loginToMemberCenter()
    }).then(async (value) => {
      return await player.loginPhp()
    }).then(async (_) => {
      return await player.home()
    }).then(async (_) => {
      await prisma.user.update({
        where: {
          id: ctx.state.user?.id
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
      ctx.type = 'json'
      ctx.body = {
        code: 0
      }
    }).catch((_) => {
      ctx.type = 'json'
      ctx.body = {
        code: 200
      }
    })
  })

  router.post('/profile', async (ctx) => {
    const biliAccos = await prisma.user.findUnique({
      where: {
        id: ctx.state.user?.id
      }
    }).biliAccos()
    ctx.type = 'json'
    ctx.body = {
      code: 0,
      biliAccos: biliAccos?.map((value) => {
        return {
          name: value.biliName,
          id: value.biliId.toString(),
          isios: value.isIOS
        }
      })
    }
  })

  router.post('/getQuest', async (ctx) => {
    const biliAcco = await prisma.user.findUnique({
      where: {
        id: ctx.state.user?.id
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
    ctx.body = {
      code: 0,
      quests: loginResult.cache.replaced.userQuest.map((value: { questId: string, questPhase: string, challengeNum: string }) => {
        return {
          questId: value.questId,
          questPhase: value.questPhase,
          challengeNum: value.challengeNum
        }
      })
    }
  })

  router.post('/order', async (ctx) => {
    const user = await prisma.user.findUnique({
      where: {
        id: ctx.state.user?.id
      }
    })
    const biliAcco = await prisma.biliAcco.findUnique({
      where: {
        biliId: ctx.request.body.biliId.toString()
      }
    })
    if (user === null || biliAcco === null) return
    const order = await prisma.order.create({
      data: {
        questId: ctx.request.body.questId,
        questPhase: ctx.request.body.questPhase,
        num: ctx.request.body.num,
        biliId: biliAcco.biliId.toString(),
        goldapple: ctx.request.body.useApple[0],
        silverapple: ctx.request.body.useApple[1],
        copperapple: ctx.request.body.useApple[2],
        bronzeapple: ctx.request.body.useApple[3],
        creator: {
          connect: {
            id: user.id
          }
        }
      }
    })
    void worker.addLoop(new GameUser(biliAcco.biliName, biliAcco.biliPass), order).catch((reason) => {
      console.log(`${order.biliId}'s order ${order.id} error`)
      console.log(reason)
    })
    ctx.type = 'json'
    ctx.body = {
      code: 0
    }
  }).post('/query', async (ctx) => {
    const orders = await prisma.user.findUnique({
      where: {
        id: ctx.state.user?.id
      }
    }).orders()
    ctx.body = {
      code: 0,
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
    }
  })

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
    console.log('FaerieKingdom V0.2.2')
    console.log('Powered by Koa & Vue')
  })
})().then(async () => {
  await prisma.$disconnect()
}).catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
