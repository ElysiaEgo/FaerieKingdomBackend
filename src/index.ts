import { PrismaClient } from '@prisma/client'
import express from 'express'
import { expressjwt, type Request as JwtRequest } from 'express-jwt'
import jwt from 'jsonwebtoken'
import GameUser from './api/user'
import { Worker } from './executer'

const prisma = new PrismaClient()
const app = express()
const secretKey = 'FaerieKingdomByElysiaEgo@2023'
const port = 9898
const worker = new Worker(prisma);

(async () => {
  app.use(express.json({
    limit: '10kb'
  }))

  app.use(expressjwt({
    secret: secretKey,
    algorithms: ['HS256'],
    getToken: (req) => {
      try {
        return req.body.token
      } catch (_) {
        return null
      }
    }
  }).unless({
    path: ['/reg', '/login']
  }))

  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err.stack)
    res.status(500).json({
      code: 300
    })
  })

  app.post('/reg', async (req, res) => {
    const user = await prisma.user.findUnique({
      where: {
        name: req.body.uname
      }
    })
    if (user !== null) {
      res.status(403).json({
        code: 100
      })
    } else {
      await prisma.user.create({
        data: {
          name: req.body.uname,
          password: req.body.passwd
        }
      })
      res.json({
        code: 0
      })
    }
  }).post('/login', async (req, res) => {
    const user = await prisma.user.findUnique({
      where: {
        name: req.body.uname
      }
    })
    if (user === null || user.password !== req.body.passwd) {
      res.status(403).json({
        code: 100,
        token: '',
        userid: 0
      })
    } else {
      const token = jwt.sign({
        id: user.id,
        name: user.name,
        pass: user.password
      }, secretKey, { expiresIn: '1d' })
      res.json({
        code: 0,
        token,
        userid: user.id
      })
    }
  })

  app.post('/bili_login', async (req: JwtRequest, res) => {
    const acco = await prisma.biliAcco.findUnique({
      where: {
        biliName: req.body.biliname
      }
    })
    if (acco !== null) {
      res.json({
        code: 200
      })
      return
    }
    const player = new GameUser(req.body.biliname, req.body.bilipass)
    await player.getSdkCipher().then(async (_) => {
      return await player.SdkLoginPassword()
    }).then(async (_) => {
      return await player.loginToMemberCenter()
    }).then(async (_) => {
      return await player.loginPhp()
    }).then(async (_) => {
      return await player.home()
    }).then(async (_) => {
      await prisma.user.update({
        where: {
          id: req.auth?.id
        },
        data: {
          biliAccos: {
            create: {
              biliName: req.body.biliname,
              biliPass: req.body.bilipass,
              biliId: player.userId.toString()
            }
          }
        }
      })
      res.json({
        code: 0
      })
    }).catch((_) => {
      res.json({
        code: 200
      })
    })
  })

  app.post('/profile', async (req: JwtRequest, res) => {
    const biliAccos = await prisma.user.findUnique({
      where: {
        id: req.auth?.id
      }
    }).biliAccos()
    res.json({
      code: 0,
      biliAccos: biliAccos?.map((value) => {
        return {
          name: value.biliName,
          id: value.biliId.toString()
        }
      })
    })
  })

  app.post('/getQuest', async (req: JwtRequest, res) => {
    const biliAcco = await prisma.user.findUnique({
      where: {
        id: req.auth?.id
      }
    }).biliAccos({
      where: {
        biliId: req.body.biliId.toString()
      }
    })
    if (biliAcco === null) return
    const player = new GameUser(biliAcco[0].biliName, biliAcco[0].biliPass)
    await player.getSdkCipher()
    await player.SdkLoginPassword()
    await player.loginToMemberCenter()
    await player.loginPhp()
    const loginResult = await player.topLogin()
    res.json({
      code: 0,
      quests: loginResult.cache.replaced.userQuest.map((value: { questId: string, questPhase: string, challengeNum: string }) => {
        return {
          questId: value.questId,
          questPhase: value.questPhase,
          challengeNum: value.challengeNum
        }
      })
    })
  })

  app.post('/order', async (req: JwtRequest, res) => {
    const user = await prisma.user.findUnique({
      where: {
        id: req.auth?.id
      }
    })
    const biliAcco = await prisma.biliAcco.findUnique({
      where: {
        biliId: req.body.biliId.toString()
      }
    })
    if (user === null || biliAcco === null) return
    const order = await prisma.order.create({
      data: {
        questId: req.body.questId,
        questPhase: req.body.questPhase,
        num: req.body.num,
        biliId: biliAcco.biliId.toString(),
        creator: {
          connect: {
            id: user.id
          }
        }
      }
    })
    void worker.add(new GameUser(biliAcco.biliName, biliAcco.biliPass), order)
    res.json({
      code: 0
    })
  }).post('/query', async (req: JwtRequest, res) => {
    const orders = await prisma.user.findUnique({
      where: {
        id: req.auth?.id
      }
    }).orders()
    res.json({
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
    })
  })

  app.listen(port, () => {
    console.log('FaerieKingdom V0.2.1')
    console.log('Powered by Express & Vue')
  })
})().then(async () => {
  await prisma.$disconnect()
}).catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
