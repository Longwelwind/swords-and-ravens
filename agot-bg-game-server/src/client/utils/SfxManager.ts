
import footmanYesMyLordSound from "../../../public/sounds/footman-yes-my-lord.ogg";
import intenseHorseStallionNeighSound from "../../../public/sounds/intense-horse-stallion-neigh.ogg";
import horseWhinnySound from "../../../public/sounds/horse-whinny.ogg";
import horseGallopSound from "../../../public/sounds/horse-gallop.ogg";
import ayeAyeCaptainSound from "../../../public/sounds/aye-aye-captain.ogg";
import siegeTowerMovementSound from "../../../public/sounds/siege-tower-movement.ogg";
import catapultRetractSound from "../../../public/sounds/catapult-retract.ogg";
import dragonRoarSound from "../../../public/sounds/dragon-roar.ogg";
import dragonGruntSound from "../../../public/sounds/dragon-grunt.ogg";
import dragonRoaringAndBreatheFireSound from "../../../public/sounds/dragon-roaring-and-breathe-fire.ogg";
import dragonHowlingRoarSound from "../../../public/sounds/dragon-howling-roar.ogg";

import roarSound from "../../../public/sounds/roar.ogg";
import attackyYellSound from "../../../public/sounds/attacky-yell.ogg";
import longYellSound from "../../../public/sounds/long-yell.ogg";
import angryGruntSound from "../../../public/sounds/angry-grunt.ogg";

import hystericalLaughSound from "../../../public/sounds/hysterical-laugh.ogg";
import swordCuttingAndKillingSound from "../../../public/sounds/sword-cutting-and-killing.ogg";
import goreSwordStabSound from "../../../public/sounds/gore-sword-stab.ogg";

import notificationSound from "../../../public/sounds/notification.ogg";
import ravenCallSound from "../../../public/sounds/raven_call.ogg";
import voteSound from "../../../public/sounds/vote-started.ogg";
import introSound from "../../../public/sounds/game-of-thrones-intro.ogg";
import combatSound from "../../../public/sounds/combat.ogg";

const soundsForKnights = [
    intenseHorseStallionNeighSound,
    footmanYesMyLordSound,
    horseWhinnySound,
    horseGallopSound
];

const soundsForShips = [
    ayeAyeCaptainSound,
    footmanYesMyLordSound
];

const soundsForSiegeEngines = [
    siegeTowerMovementSound,
    catapultRetractSound
];

const soundsForBigDragons = [
    dragonRoarSound,
    dragonRoaringAndBreatheFireSound
];

const soundsForSmallDragons = [
    dragonGruntSound
];

const soundsForFootmenOnly = [
    roarSound,
    footmanYesMyLordSound,
    attackyYellSound,
    longYellSound,
    angryGruntSound
];

const soundsWhenUnitsAreDestroyedBySwords = [
    swordCuttingAndKillingSound,
    goreSwordStabSound
];

const soundsWhenDragonsAreDestroyed = [
    dragonHowlingRoarSound
];


import _ from "lodash";
import { pickRandom } from "../../utils/popRandom";
import { GameLogData } from "../../common/ingame-game-state/game-data-structure/GameLog";
import GameClient from "../GameClient";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import unitTypes, { dragon, knight, ship, siegeEngine } from "../../common/ingame-game-state/game-data-structure/unitTypes";

class SfxManager {
    currentlyPlayingMusic: HTMLAudioElement[] = [];
    currentlyPlayingNotifications: HTMLAudioElement[] = [];

    constructor(private gameClient: GameClient) {}

    notificationVolumeChanged(newVal: number): void {
        this.currentlyPlayingNotifications.forEach(cpn => {
            cpn.volume = newVal;
        });

        this.gameClient.notificationsVolume = newVal;
    }

    musicVolumeChanged(newVal: number): void {
        this.currentlyPlayingMusic.forEach(cpm => {
            cpm.volume = newVal;
        });

        this.gameClient.musicVolume = newVal;
    }

    stopCurrentMusicAndSfx(): void {
        this.currentlyPlayingMusic.forEach(currentlyPlayingAudio => {
            currentlyPlayingAudio.pause();
            currentlyPlayingAudio.currentTime = 0;
        });

        while (this.currentlyPlayingMusic.length > 0) {
            const cpa = this.currentlyPlayingMusic.shift();
            if (cpa) {
                cpa.pause();
                cpa.currentTime = 0;
            }
        }
    }

    fadeOutCurrentSfx(): void {
        this.fadeOut(1000, 10);
    }

    fadeOutCurrentMusic(): void {
        this.fadeOut(4000, 40);
    }

    private fadeOut(fadeOutDuration: number, fadeOutSteps: number): void {
        if (this.currentlyPlayingMusic.length === 0) {
            return;
        }

        const fadeOutInterval = fadeOutDuration / fadeOutSteps;
        const volumeStep = this.gameClient.musicVolume / fadeOutSteps;

        let interval = window.setInterval(() => {
            if (this.currentlyPlayingMusic.length === 0 && interval > 0) {
                clearInterval(interval);
                interval = 0;
                return;
            }

            this.currentlyPlayingMusic.forEach(audio => {
                if (audio.volume - volumeStep > 0) {
                    audio.volume -= volumeStep;
                } else {
                    audio.volume = 0;
                    if (!audio.paused) {
                        audio.pause();
                        audio.currentTime = 0;
                    }
                    audio.dispatchEvent(new Event('ended'));
                }
            });
        }, fadeOutInterval);
    }

    playNotificationSound(): void {
        if (this.gameClient.muted) {
            return;
        }

        this.playNotification(notificationSound, this.gameClient.notificationsVolume);
    }

    playVoteNotificationSound(): void {
        if (this.gameClient.muted) {
            return;
        }

        this.playNotification(voteSound, this.gameClient.notificationsVolume);
    }

    playNewMessageReceivedSound(): void {
        if (this.gameClient.muted) {
            return;
        }

        this.playNotification(ravenCallSound, this.gameClient.notificationsVolume);
    }

    playGotTheme(): void {
        if (this.gameClient.musicMuted) {
            return;
        }

        this.playMusic(introSound, this.gameClient.musicVolume, false);
    }

    playCombatSound(): void {
        if (this.gameClient.musicMuted) {
            return;
        }

        this.playMusic(combatSound, this.gameClient.musicVolume, false);
    }

    playSoundWhenClickingMarchOrder(region: Region): void {
        if (this.gameClient.musicMuted) {
            return;
        }

        const army = region.units.values;

        const hasKnights = army.some(u => u.type == knight);
        const hasShips = army.some(u => u.type == ship);
        const hasSiegeEngines = army.some(u => u.type == siegeEngine);
        const hasDragons = army.some(u => u.type == dragon);

        const files = hasDragons && (this.gameClient.entireGame?.ingameGameState?.game.currentDragonStrength ?? -1) <= 2
            ? soundsForSmallDragons
            : hasDragons
                ? soundsForBigDragons
                : hasSiegeEngines
                    ? soundsForSiegeEngines
                    : hasKnights
                        ? soundsForKnights
                        : hasShips
                            ? soundsForShips
                            : soundsForFootmenOnly;

        this.playRandomMusic(files, this.gameClient.musicVolume, true);
    }

    playSoundForLogEvent(log: GameLogData): void {
        if (this.gameClient.musicMuted) {
            return;
        }

        switch(log.type) {
            case "doran-martell-asos-used":
            case "doran-used":
                this.playMusic(hystericalLaughSound, this.gameClient.musicVolume, false);
                break;
            case "killed-after-combat": {
                const units = log.killed.map(ut => unitTypes.get(ut));
                if (units.includes(dragon)) {
                    this.playRandomMusic(soundsWhenDragonsAreDestroyed, this.gameClient.musicVolume, false);
                } else {
                    this.playRandomMusic(soundsWhenUnitsAreDestroyedBySwords, this.gameClient.musicVolume, false);
                }
                break;
            }
            case "immediatly-killed-after-combat": {
                const killed = _.concat(log.killedBecauseCantRetreat, log.killedBecauseWounded);
                const units = killed.map(ut => unitTypes.get(ut));
                if (units.includes(dragon)) {
                    this.playRandomMusic(soundsWhenDragonsAreDestroyed, this.gameClient.musicVolume, false);
                }
                break;
            }
            case "retreat-casualties-suffered": {
                const units = log.units.map(ut => unitTypes.get(ut));
                if (units.includes(dragon)) {
                    this.playRandomMusic(soundsWhenDragonsAreDestroyed, this.gameClient.musicVolume, false);
                }
                break;
            }
        }
    }

    private playRandomMusic(files: string[], volume: number, withCurrentPlayingCheck: boolean): void {
        const randomFile = pickRandom(files);
        if (!randomFile) {
            return;
        }
        this.playMusic(randomFile, volume, withCurrentPlayingCheck);
    }

    private playMusic(file: string, volume: number, withCurrentPlayingCheck: boolean): void {
        if (withCurrentPlayingCheck && this.currentlyPlayingMusic.length > 0) {
            return;
        }
        const audio = new Audio(file);
        this.currentlyPlayingMusic.push(audio);
        audio.onended = () => _.pull(this.currentlyPlayingMusic, audio);
        audio.volume = volume;
        audio.play();
    }

    private playNotification(file: string, volume: number): void {
        const audio = new Audio(file);
        this.currentlyPlayingNotifications.push(audio);
        audio.onended = () => _.pull(this.currentlyPlayingNotifications, audio);
        audio.volume = volume;
        audio.play();
    }
}

export default SfxManager;
