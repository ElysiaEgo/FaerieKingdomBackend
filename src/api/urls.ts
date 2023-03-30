import util from 'util'

export default class Urls {
  private userId = 0
  private host = 'line1-s2-bili-fate.bilibiligame.net'

  setUserId (userId: number): void {
    this.userId = userId
  }

  setHost (host: string): void {
    this.host = host
  }

  getCipher (): string {
    return 'https://line1-sdk-center-login-sh.biligame.net/api/external/issue/cipher/v3'
  }

  getSdkLogin (): string {
    return 'https://line1-sdk-center-login-sh.biligame.net/api/external/login/v3'
  }

  getLoginToMemberCenter (): string {
    return util.format('https://%s/rongame_beta/rgfate/60_member/logintomembercenter.php', this.host)
  }

  getLoginPhp (): string {
    return util.format('https://%s/rongame_beta/rgfate/60_1001/login.php', this.host)
  }

  getAction (ac: string): string {
    return util.format('https://%s/rongame_beta/rgfate/60_1001/ac.php?_userId=%d&_key=%s', this.host, this.userId, ac)
  }
}
