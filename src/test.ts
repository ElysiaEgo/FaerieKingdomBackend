import GameUser from './gameApi/user'
import fs from 'fs'

try {
  fs.unlinkSync('./output.json')
} catch (_) {}

function log (obj: any): void {
  fs.appendFileSync('./output.json', JSON.stringify(obj))
  fs.appendFileSync('./output.json', '\n')
}
async function sleep (time: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, time)
  })
}

void (async () => {
  const player = new GameUser('heqyou_free@126.com', 'bilibili#@#2003')
  log(await player.getSdkCipher())
  log(await player.SdkLoginPassword())
  log(await player.loginToMemberCenter())
  log(await player.loginPhp())
  const loginResult = await player.topLogin()
  log(loginResult)
  log(await player.home())
  const deckId = parseInt(loginResult.cache.replaced.userDeck[0].id)
  const followerListResult = await player.followerlist(94061636)
  log(followerListResult)
  const battleSetupResult = await player.battlesetup(94061636, 1, deckId, parseInt(followerListResult.cache.updated.userFollower[0].followerInfo[0].userSvtLeaderHash[0].userId), parseInt(followerListResult.cache.updated.userFollower[0].followerInfo[0].userSvtLeaderHash[0].classId))
  log(battleSetupResult)
  await sleep(5000)
  const battleResultResult = await player.battleresult(parseInt(battleSetupResult.cache.replaced.battle[0].id))
  log(battleResultResult)
})()
