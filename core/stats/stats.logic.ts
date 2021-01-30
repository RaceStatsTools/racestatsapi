import { StatsRepo } from './stats.repo';
import { HttpResponse } from '../../utils/httpResponse';
import { iLap } from './iLap';
import { iRace } from './iRace';

export class raceFull {
  uuid: string = '';
  name: string = '';
  country: string = '';
  created_at: Date = new Date;
  length: string = '';
  asphalt: number = 0;
  gravel: number = 0;
  position: number = 0;
  time: string = "";
  user_id: number = 0;
  laps: iLap[] = [];
}

export class StatsLogic {

  private static _instance: StatsLogic

  /**
   * Singleton
   */
  static getInstance(): StatsLogic {
    if (this._instance === undefined) {
      this._instance = new StatsLogic();
    }
    return this._instance;
  }

  async postLap(lap: iLap) {
    try {
      let result = await StatsRepo.getInstance().postLap(lap);
      return new HttpResponse(200, result);
    } catch (e) {
      console.error(`[statsLogic.postLap] error with Lap ${lap}`);
      console.error(e);
      return new HttpResponse(500);
    }
  }

  async postRace(race: iRace) {
    try {
      let result = await StatsRepo.getInstance().postRace(race);
      return new HttpResponse(200, result);
    } catch (e) {
      console.error(`[statsLogic.postLap] error with Race ${race}`);
      console.error(e);
      return new HttpResponse(500);
    }
  }

  async listTracks() {
    try {
      let result = await StatsRepo.getInstance().listTracks();
      return new HttpResponse(200, result);
    } catch (e) {
      console.error(`[statsLogic.listTracks] error `);
      console.error(e);
      return new HttpResponse(500);
    }
  }

  async trackRanking(track: number) {
    try {
      let result = await StatsRepo.getInstance().trackRanking(track);
      return new HttpResponse(200, result);
    } catch (e) {
      console.error(`[statsLogic.trackRanking] error `);
      console.error(e);
      return new HttpResponse(500);
    }
  }

  async listUserRacesByTrackId(userId: number, id: number) {
    try {
      let result = await StatsRepo.getInstance().listUserRacesByTrackId(userId, id);

      result = this.parseRacesAndLaps(result)
      return new HttpResponse(200, result);
    } catch (e) {
      console.error(`[statsLogic.listRacesByLength] error `);
      console.error(e);
      return new HttpResponse(500);
    }
  }

  async listRacesByDate(startDate: string, endDate: string, users: Array<number>) {
    try {
      let result = await StatsRepo.getInstance().listRacesByDate(startDate, endDate, users);
      let currentRound = 0;
      let currentTrack = '';
      let currentTime = 0;
      let event = {
        start: startDate,
        end: endDate,
        users: users,
        stages: Array<any>()
      }

      let currentStage = {
        track: '',
        created_at: '',
        rounds: Array<any>()
      }
      result.forEach(race => {
        if (race.name != currentTrack) {
          if (currentTrack != '') {
            // Curent track changed
            event.stages.push(currentStage)
          }
          currentRound = -1;
          currentTrack = race.name;
          currentStage = {
            track: currentTrack,
            created_at: race.created_at,
            rounds: Array<any>()
          }
          // Create new currentStage
        }

        if (currentTime == 0) {
          // Create new round
          currentRound++
          let round = {
            number: currentRound,
            races: Array<number>(),
            laps: Array<any>()
          }
          round.races.push(race.id)
          currentStage.rounds.push(round)
          // Add round to stage
          currentTime = race.created_at
        } else {
          let diff = race.created_at - currentTime;
          
          if (diff < 60000 && diff > -60000) {
            // Add race to round
            currentStage.rounds[currentRound].races.push(race.id)
          } else {
            // Create new round
            currentRound++
            currentTime = race.created_at
            let round = {
              number: currentRound,
              races: Array<number>(),
              laps: Array<any>()
            }
            // Add round to stage
            round.races.push(race.id)
            // Add race to round
            currentStage.rounds.push(round)
          }
        }
      })
      event.stages.push(currentStage)
      // Get all laps for this event
      for (let stage of event.stages) {
        for (let round of stage.rounds) {
          let laps = await StatsRepo.getInstance().listLapsForRaces(round.races);
          let currentLap = -1
          let cleanLaps: Array<any> = []
          laps.forEach(item => {
            if (currentLap != item.lap) {
              // New lap
              currentLap = item.lap
              let lap = {
                lap: currentLap,
                times: Array<any>()
              }
              lap.times.push({
                user_id: item.user_id,
                nickname: item.nickname,
                country: item.country,
                time: item.time,
              })
              // Add lap time
              cleanLaps.push(lap)
              // Push lap
            } else {
              // Add lap time
              let times: Array<any> = cleanLaps[currentLap].times;
              times.push({
                user_id: item.user_id,
                nickname: item.nickname,
                country: item.country,
                time: item.time,
              })
              cleanLaps[currentLap].times = times
            }
          })
          // Push laps
          round.laps.push(cleanLaps)
        }
      }

      return new HttpResponse(200, event);
    } catch (e) {
      console.error(`[statsLogic.listRaceByDate] error `);
      console.error(e);
      return new HttpResponse(500);
    }
  }

  async listBestLaps(userId: number) {
    try {
      let result = await StatsRepo.getInstance().listBestLaps(userId);

      return new HttpResponse(200, result);
    } catch (e) {
      console.error(`[statsLogic.listRacesByLength] error `);
      console.error(e);
      return new HttpResponse(500);
    }
  }

  async listBestLapsHistory(track: string, duration: number, userId: number) {
    try {
      let result = await StatsRepo.getInstance().listBestLapsHistory(track, duration, userId);
      let formatedResult: Array<any> = [];
      const today = new Date(new Date().setHours(0, 0, 0, 0));
      const beginDate = new Date(today)
      beginDate.setDate(today.getDate() - duration);

      for (let i = 0; i < duration; i++) {
        formatedResult.push(null)
      }
      if (result.length > 0) {
        result.forEach(time => {
          const currentDate = new Date(time.date);
          const dateIndex = (currentDate.getTime() - beginDate.getTime()) / (24 * 3600 * 1000);
          formatedResult[Math.round(dateIndex)] = time.time
        })
      }
      return new HttpResponse(200, formatedResult);
    } catch (e) {
      console.error(`[statsLogic.listRacesByLength] error `);
      console.error(e);
      return new HttpResponse(500);
    }
  }

  parseRacesAndLaps(laps: any[]): any[] {
    let races: raceFull[] = [];
    let currentRace = '';
    let race: raceFull = new raceFull();
    let raceToPush = 1;
    for (let lap of laps) {
      if (currentRace != lap.uuid) {
        if (currentRace != '') {
          races.push(race);
          raceToPush--;
        }
        currentRace = lap.uuid
        race = new raceFull();
        raceToPush++;
        race.uuid = lap.uuid;
        race.name = lap.name;
        race.country = lap.country;
        race.created_at = lap.race_date;
        race.length = parseInt(lap.length).toString();
        race.asphalt = lap.asphalt;
        race.gravel = lap.gravel;
        race.position = lap.position;
        race.time = this.formatRaceTime(lap.race_time);
        race.user_id = lap.user_id;

        var currentLap: iLap = {
          id: lap.id,
          userId: lap.user_id,
          track: lap.length,
          createdAt: lap.created_at,
          time: lap.time,
          lap: lap.lap,
          race: lap.uuid
        };

        race.laps.push(currentLap)
      } else {
        var currentLap: iLap = {
          id: lap.id,
          userId: lap.user_id,
          track: lap.length,
          createdAt: lap.created_at,
          time: lap.time,
          lap: lap.lap,
          race: lap.uuid
        };

        race.laps.push(currentLap)
      }
    }
    if (raceToPush > 0 && race.laps.length > 0) {
      races.push(race);
    }
    return races;
  }

  formatRaceTime(time: number) {
    let minutes = parseInt(`${time / 60}`);
    let minutesString = "0" + minutes.toString()
    minutesString = minutesString.substring(minutesString.length - 2, minutesString.length);

    let seconds = parseInt(`${time - minutes * 60}`);
    let secondsString = "0" + seconds.toString()
    secondsString = secondsString.substring(secondsString.length - 2, secondsString.length);

    let ms = parseInt(`${(time - minutes * 60 - seconds) * 1000}`);
    let msString = ms.toString() + "000";
    msString = msString.substring(0, 3);
    let timeString = "";
    if (minutes > 0) {
      timeString = minutesString + ":" + secondsString + "." + msString;
    } else {
      timeString = secondsString + "." + msString;
    }

    return timeString
  }

}
