import { encryptMd5Usk, encryptPassword, generateSign, getBdId, getBruvid } from './cryptoData'
import { v4 as uuid } from 'uuid'
import axios, { type AxiosError } from 'axios'
import qs from 'querystring'
import Urls from './urls'
import crc32 from 'crc-32'

interface StandardResponse {
  response: Array<{
    resCode: string
    success: any
    fail: any
    nid: string
    usk: string
  }>
  cache: {
    updated: any
    replaced: any
    serverTime: number
  }
  sign: string
}

export default class GameUser {
  private readonly account: string
  private readonly password: string

  public userId: number = 0
  private nickname: string = ''
  private rguid: number = 0
  private rkuid: number = 0
  private rgusk: string = ''
  private readonly sgtag: number = 0
  private usk: string = ''
  private accessToken = ''
  private dateVer = 707
  private dataVer = 707
  private hash = ''
  private cipherKey = ''

  private readonly urls = new Urls()

  constructor (acc: string, pwd: string) {
    this.account = acc
    this.password = pwd
  }

  public async getSdkCipher (): Promise<any> {
    const dic: Record<string, string> = {
      cur_buvid: getBruvid(),
      sdk_type: '1',
      merchant_id: '1',
      platform: '3',
      apk_sign: '4502a02a00395dec05a4134ad593224d',
      platform_type: '3',
      old_buvid: getBruvid(),
      app_id: '112',
      game_id: '112',
      timestamp: Math.floor(new Date().getTime() / 1000).toString(),
      cipher_type: 'bili_login_rsa',
      version_code: '175',
      bd_id: getBdId(),
      server_id: '248',
      version: '3',
      domain_switch_count: '0',
      app_ver: '2.57.0',
      domain: 'line1-sdk-center-login-sh.biligame.net',
      original_domain: 'https%3A%2F%2Fline1-sdk-center-login-sh.biligame.net',
      sdk_log_type: '1',
      current_env: '0',
      sdk_ver: '5.4.2',
      channel_id: '1'
    }
    dic.sign = generateSign(dic)
    return await axios({
      method: 'POST',
      url: this.urls.getCipher(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: qs.stringify(dic)
    }).then((value) => {
      this.hash = value.data.hash
      this.cipherKey = value.data.cipher_key
      return value.data
    })
  }

  public async SdkLoginPassword (): Promise<any> {
    const dic: Record<string, string> = {
      cur_buvid: getBruvid(),
      sdk_type: '1',
      merchant_id: '1',
      platform: '3',
      apk_sign: '4502a02a00395dec05a4134ad593224d',
      platform_type: '3',
      old_buvid: getBruvid(),
      udid: getBruvid(),
      app_id: '112',
      game_id: '112',
      timestamp: Math.floor(new Date().getTime() / 1000).toString(),
      version_code: '175',
      bd_id: getBdId(),
      server_id: '248',
      version: '3',
      domain_switch_count: '0',
      user_id: this.account,
      app_ver: '2.57.0',
      domain: 'line1-sdk-center-login-sh.biligame.net',
      original_domain: 'https%3A%2F%2Fline1-sdk-center-login-sh.biligame.net',
      sdk_log_type: '1',
      current_env: '0',
      sdk_ver: '5.4.2',
      pwd: encryptPassword(this.hash + this.password, this.cipherKey),
      channel_id: '1'
    }
    dic.sign = generateSign(dic)
    return await axios({
      method: 'POST',
      url: this.urls.getSdkLogin(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: qs.stringify(dic)
    }).then((value) => {
      this.nickname = value.data.uname
      this.accessToken = value.data.access_key
      this.rkuid = value.data.uid
      return value.data
    })
  }

  public async loginToMemberCenter (): Promise<StandardResponse> {
    const dic: Record<string, string> = {
      t: '22360',
      v: '1.0.1',
      s: '1',
      mac: '00000000000000E0',
      imei: 'aaaaa',
      rksdkid: '1',
      username: this.nickname,
      bundleid: 'com.bilibili.fatego',
      type: 'token',
      rkuid: this.rkuid.toString(),
      access_token: this.accessToken,
      rkchannel: '24',
      cPlat: '3',
      uPlat: '3'
    }
    return await this.post(this.urls.getLoginToMemberCenter(), this.addCommonField(dic)).then((value) => {
      this.usk = value.response[0].usk
      this.rguid = parseInt(value.response[0].success.rguid)
      this.rgusk = value.response[0].success.rgusk
      this.dateVer = value.response[0].success.dateVer
      this.dataVer = value.response[0].success.dataVer
      return value
    })
  }

  public async loginPhp (): Promise<StandardResponse> {
    const dic: Record<string, string> = {
      rgsid: '1001',
      rguid: this.rguid.toString(),
      rgusk: this.rgusk,
      idfa: '',
      v: '1.0.1',
      mac: '0',
      imei: '',
      type: 'login',
      nickname: '',
      rkchannel: '24',
      cPlat: '3',
      uPlat: '3',
      assetbundleFolder: '',
      t: '20399',
      s: '1',
      rksdkid: '1'
    }
    return await this.post(this.urls.getLoginPhp(), this.addCommonField(dic)).then((value) => {
      this.usk = encryptMd5Usk(value.response[0].usk)
      this.nickname = value.response[0].success.nickname
      this.userId = parseInt(value.response[0].success.sguid)
      this.urls.setUserId(this.userId)
      return value
    })
  }

  public async topLogin (): Promise<StandardResponse> {
    const dic: Record<string, string> = {
      nickname: this.nickname
    }
    return await this.post(this.urls.getAction('toplogin'), this.addActionField(dic, 'toplogin')).then(this.updateUsk.bind(this))
  }

  public async home (): Promise<StandardResponse> {
    const dic: Record<string, string> = {}
    return await this.post(this.urls.getAction('home'), this.addActionField(dic, 'home')).then(this.updateUsk.bind(this))
  }

  public async followerlist (questId: number): Promise<StandardResponse> {
    const dic: Record<string, string> = {
      questId: questId.toString(),
      questPhase: '1',
      refresh: ''
    }
    return await this.post(this.urls.getAction('followerlist'), this.addActionField(dic, 'followerlist')).then(this.updateUsk.bind(this))
  }

  public async battlesetup (questId: number, questPhase: number, deckId: number, followerId: number, followerClassId: number): Promise<StandardResponse> {
    const dic: Record<string, string> = {
      activeDeckId: deckId.toString(),
      followerId: followerId.toString(),
      userEquipId: '0',
      routeSelect: '[]',
      choiceRandomLimitCounts: '{}',
      questId: questId.toString(),
      questPhase: questPhase.toString(),
      followerClassId: followerClassId.toString(),
      itemId: '0',
      boostId: '0',
      enemySelect: '0',
      questSelect: '0',
      followerType: '1',
      followerRandomLimitCount: '0',
      followerSupportDeckId: '1',
      campaignItemId: '0'
    }
    return await this.post(this.urls.getAction('battlesetup'), this.addActionField(dic, 'battlesetup')).then(this.updateUsk.bind(this))
  }

  public async battleresult (battleid: number): Promise<StandardResponse> {
    const battleResult = {
      battleId: battleid,
      battleResult: 1,
      winResult: 1,
      scores: '',
      action: JSON.stringify({ logs: [{ uid: 2, ty: 2 }, { uid: 1, ty: 1 }, { uid: 2, ty: 3 }, { uid: 3, ty: 1 }, { uid: 1, ty: 3 }, { uid: 3, ty: 2 }, { uid: 3, ty: 2 }, { uid: 1, ty: 2 }, { uid: 2, ty: 2 }], dt: [{ uniqueId: 12, hp: 0, atk: 1167 }, { uniqueId: 13, hp: 0, atk: 1167 }, { uniqueId: 14, hp: 0, atk: 2974 }], hd: 'AA==', data: 'AA==' }),
      raidResult: '[]',
      superBossResult: '[]',
      elapsedTurn: 1,
      recordType: 1,
      recordValueJson: {
        turnMaxDamage: 0,
        knockdownNum: 0,
        totalDamageToAliveEnemy: 0
      },
      tdPlayed: '[]',
      usedEquipSkillList: {},
      svtCommonFlagList: {},
      skillShiftUniqueIds: [],
      skillShiftNpcSvtIds: [],
      calledEnemyUniqueIds: [],
      aliveUniqueIds: [],
      voicePlayedList: '[]',
      usedTurnList: [1, 1, 1]
    }
    const userIdAndResultBytes = Buffer.from((this.userId + battleResult.battleResult).toString(16), 'hex')
    const raidResultBytes = Buffer.from((-4231125).toString(16), 'hex')
    const aliveUniqueIdsBytes = Buffer.from((0 >> 1).toString(16), 'hex')
    const battleIdBytes = Buffer.from((battleid - 0x7FFFFFFF).toString(16), 'hex')
    const superBossResultBytes = Buffer.from((-2469110).toString(16), 'hex')
    const bytes = Buffer.concat([userIdAndResultBytes, raidResultBytes, aliveUniqueIdsBytes, battleIdBytes, superBossResultBytes])
    const checksum = crc32.buf(bytes)
    Object.defineProperty(battleResult, 'battleStatus', {
      value: checksum
    })
    const dic: Record<string, string> = {
      raidResult: '[]',
      superBossResult: '[]',
      result: JSON.stringify(battleResult)
    }
    return await this.post(this.urls.getAction('battleresult'), this.addActionField(dic, 'battleresult')).then(this.updateUsk.bind(this))
  }

  public async itemrecover (recoverId: number, num: number): Promise<StandardResponse> {
    const dic: Record<string, string> = {
      recoverId: recoverId.toString(),
      num: num.toString()
    }
    return await this.post(this.urls.getAction('itemrecover'), this.addActionField(dic, 'itemrecover')).then(this.updateUsk.bind(this))
  }

  private updateUsk (value: StandardResponse): StandardResponse {
    this.usk = encryptMd5Usk(value.response[0].usk)
    return value
  }

  private async post (url: string, data: Record<string, string>): Promise<StandardResponse> {
    return await axios({
      method: 'POST',
      url,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: qs.stringify(data)
    }).then((value) => this.parseResp(value.data)).catch((reason: AxiosError) => {
      console.log(reason.message)
      console.log(reason.response?.status)
      console.dir(this.parseResp(reason.response?.data as string), { depth: null })
    })
  }

  private parseResp (resp: string): any {
    return JSON.parse(Buffer.from(decodeURIComponent(resp), 'base64').toString('utf-8'))
  }

  private addActionField (dic: Record<string, string>, key: string): Record<string, string> {
    dic.ac = 'action'
    dic.key = key
    return this.addCommonField(this.addPlatfromField(this.addAuthField(dic)))
  }

  private addAuthField (dic: Record<string, string>): Record<string, string> {
    dic.usk = this.usk
    dic.umk = ''
    dic.sgtype = '2'
    dic.sgtag = this.sgtag.toString()
    return dic
  }

  private addPlatfromField (dic: Record<string, string>): Record<string, string> {
    dic.rgsid = '1001'
    dic.rkchannel = '24'
    dic.cPlat = '3'
    dic.uPlat = '3'
    return dic
  }

  private addCommonField (dic: Record<string, string>): Record<string, string> {
    dic.deviceid = ''
    dic.os = ''

    dic.ptype = 'motorola XT2153-1'
    dic.userAgent = '1'
    dic.userId = this.userId.toString()
    dic.appVer = '2.57.0'
    dic.dateVer = this.dateVer.toString()
    dic.lastAccessTime = Math.floor(new Date().getTime() / 1000).toString()
    dic.developmentAuthCode = 'aK8mTxBJCwZyxBjNJSKA5xCWL7zKtgZEQNiZmffXUbyQd5aLun'
    dic.idempotencyKey = uuid()
    dic.dataVer = this.dataVer.toString()
    return dic
  }
};
