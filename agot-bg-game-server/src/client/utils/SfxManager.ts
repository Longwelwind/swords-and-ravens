
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

import baratheonTheme from "../../../public/sounds/house-themes/baratheon.ogg"
import lannisterrTheme from "../../../public/sounds/house-themes/lannister.ogg"
import starkTheme from "../../../public/sounds/house-themes/stark.ogg"
import martellTheme from "../../../public/sounds/house-themes/martell.ogg"
import greyjoyTheme from "../../../public/sounds/house-themes/greyjoy.ogg"
import tyrellTheme from "../../../public/sounds/house-themes/tyrell.ogg"
import arrynTheme from "../../../public/sounds/house-themes/arryn.ogg"
import targaryenTheme from "../../../public/sounds/house-themes/targaryen.ogg"

import BetterMap from "../../utils/BetterMap";

export const houseThemes = new BetterMap([
    ["baratheon", baratheonTheme],
    ["lannister", lannisterrTheme],
    ["stark", starkTheme],
    ["martell", martellTheme],
    ["greyjoy", greyjoyTheme],
    ["tyrell", tyrellTheme],
    ["arryn", arrynTheme],
    ["targaryen", targaryenTheme],
    ["bolton", starkTheme]
]);

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
    currentlyPlayingSfx: HTMLAudioElement[] = [];

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

    sfxVolumeChanged(newVal: number): void {
        this.currentlyPlayingSfx.forEach(cpsfx => {
            cpsfx.volume = newVal;
        });

        this.gameClient.sfxVolume = newVal;
    }

    muteAll(): void {
        this.currentlyPlayingMusic.forEach(cpm => {
            cpm.volume = 0;
        });

        this.currentlyPlayingSfx.forEach(cpsfx => {
            cpsfx.volume = 0;
        });

        this.currentlyPlayingNotifications.forEach(cpn => {
            cpn.volume = 0;
        });
    }

    unmuteAll(): void {
        this.currentlyPlayingMusic.forEach(cpm => {
            cpm.volume = this.gameClient.musicVolume;
        });

        this.currentlyPlayingSfx.forEach(cpsfx => {
            cpsfx.volume = this.gameClient.sfxVolume;
        });

        this.currentlyPlayingNotifications.forEach(cpn => {
            cpn.volume = this.gameClient.notificationsVolume;
        });
    }

    fadeOutCurrentSfx(): void {
        this.fadeOutSfx(1000, 10);
    }

    fadeOutCurrentMusic(): void {
        this.fadeOutMusic(4000, 40);
    }

    private fadeOutMusic(fadeOutDuration: number, fadeOutSteps: number): void {
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

    private fadeOutSfx(fadeOutDuration: number, fadeOutSteps: number): void {
        if (this.currentlyPlayingSfx.length === 0) {
            return;
        }

        const fadeOutInterval = fadeOutDuration / fadeOutSteps;
        const volumeStep = this.gameClient.sfxVolume / fadeOutSteps;

        let interval = window.setInterval(() => {
            if (this.currentlyPlayingSfx.length === 0 && interval > 0) {
                clearInterval(interval);
                interval = 0;
                return;
            }

            this.currentlyPlayingSfx.forEach(audio => {
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

    playNotificationSound(): Promise<void> {
        if (this.gameClient.muted) {
            return Promise.resolve();
        }

        return this.playNotification(notificationSound, this.gameClient.notificationsVolume);
    }

    playVoteNotificationSound(): Promise<void> {
        if (this.gameClient.muted) {
            return Promise.resolve();
        }

        return this.playNotification(voteSound, this.gameClient.notificationsVolume);
    }

    playNewMessageReceivedSound(): Promise<void> {
        if (this.gameClient.muted) {
            return Promise.resolve();
        }

        return this.playNotification(ravenCallSound, this.gameClient.notificationsVolume);
    }

    playGotTheme(): Promise<void> {
        if (this.gameClient.muted) {
            return Promise.resolve();
        }

        return this.playMusic(introSound, this.gameClient.musicVolume);
    }

    playCombatSound(attackerId?: string): Promise<void> {
        if (this.gameClient.muted) {
            return Promise.resolve();
        }

        const sound = attackerId ? houseThemes.tryGet(attackerId, combatSound) : combatSound;
        return this.playMusic(sound, this.gameClient.musicVolume);
    }

    playSoundWhenClickingMarchOrder(region: Region): Promise<void> {
        if (this.gameClient.muted) {
            return Promise.resolve();
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

        return this.playRandomEffect(files, this.gameClient.sfxVolume, true);
    }

    playSoundForLogEvent(log: GameLogData): Promise<void> {
        if (this.gameClient.muted) {
            return Promise.resolve();
        }

        switch(log.type) {
            case "doran-martell-asos-used":
            case "doran-used":
                this.playEffect(hystericalLaughSound, this.gameClient.musicVolume, false);
                break;
            case "killed-after-combat": {
                const units = log.killed.map(ut => unitTypes.get(ut));
                if (units.includes(dragon)) {
                    return this.playRandomEffect(soundsWhenDragonsAreDestroyed, this.gameClient.musicVolume, false);
                } else {
                    return this.playRandomEffect(soundsWhenUnitsAreDestroyedBySwords, this.gameClient.musicVolume, false);
                }
                break;
            }
            case "immediatly-killed-after-combat": {
                const killed = _.concat(log.killedBecauseCantRetreat, log.killedBecauseWounded);
                const units = killed.map(ut => unitTypes.get(ut));
                if (units.includes(dragon)) {
                    return this.playRandomEffect(soundsWhenDragonsAreDestroyed, this.gameClient.musicVolume, false);
                }
                break;
            }
            case "retreat-casualties-suffered": {
                const units = log.units.map(ut => unitTypes.get(ut));
                if (units.includes(dragon)) {
                    return this.playRandomEffect(soundsWhenDragonsAreDestroyed, this.gameClient.musicVolume, false);
                }
                break;
            }
        }

        return Promise.resolve();
    }

    private playRandomEffect(files: string[], volume: number, withCurrentPlayingCheck: boolean): Promise<void> {
        const randomFile = pickRandom(files);
        if (!randomFile) {
            return Promise.resolve();
        }
        return this.playEffect(randomFile, volume, withCurrentPlayingCheck);
    }

    private playEffect(file: string, volume: number, withCurrentPlayingCheck: boolean): Promise<void> {
        if (withCurrentPlayingCheck && this.currentlyPlayingSfx.length > 0) {
            return Promise.resolve();
        }
        const audio = new Audio(file);
        this.currentlyPlayingSfx.push(audio);
        audio.onended = () => _.pull(this.currentlyPlayingSfx, audio);
        audio.volume = volume;
        return audio.play();
    }

    private playMusic(file: string, volume: number): Promise<void> {
        const audio = new Audio(file);
        this.currentlyPlayingMusic.push(audio);
        audio.onended = () => _.pull(this.currentlyPlayingMusic, audio);
        audio.volume = volume;
        return audio.play();
    }

    private playNotification(file: string, volume: number): Promise<void> {
        const audio = new Audio(file);
        this.currentlyPlayingNotifications.push(audio);
        audio.onended = () => _.pull(this.currentlyPlayingNotifications, audio);
        audio.volume = volume;
        return audio.play();
    }
}

export default SfxManager;
