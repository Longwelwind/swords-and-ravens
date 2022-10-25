import GameClient from "../GameClient";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import { GameLogData } from "../../common/ingame-game-state/game-data-structure/GameLog";
import unitTypes from "../../common/ingame-game-state/game-data-structure/unitTypes";
import { dragon, knight, ship, siegeEngine } from "../../common/ingame-game-state/game-data-structure/unitTypes";
import { pickRandom } from "../../utils/popRandom";

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

import _ from "lodash";

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

let currentlyPlayingAudio: HTMLAudioElement | null = null;

export function playSoundWhenClickingMarchOrder(this: GameClient, region: Region): void {
    if (this.musicMuted) {
        return;
    }

    const army = region.units.values;

    const hasKnights = army.some(u => u.type == knight);
    const hasShips = army.some(u => u.type == ship);
    const hasSiegeEngines = army.some(u => u.type == siegeEngine);
    const hasDragons = army.some(u => u.type == dragon);

    const files = hasDragons && (this.entireGame?.ingameGameState?.game.currentDragonStrength ?? -1) <= 2
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

    playRandomAudio(files);
}

export function playSoundForLogEvent(this: GameClient, log: GameLogData): void {
    if (this.musicMuted) {
        return;
    }

    switch(log.type) {
        case "doran-martell-asos-used":
        case "doran-used":
            const audio = new Audio(hystericalLaughSound);
            audio.play();
            break;
        case "killed-after-combat": {
            const units = log.killed.map(ut => unitTypes.get(ut));
            if (units.includes(dragon)) {
                playRandomAudio(soundsWhenDragonsAreDestroyed);
            } else {
                playRandomAudio(soundsWhenUnitsAreDestroyedBySwords);
            }
            break;
        }
        case "immediatly-killed-after-combat": {
            const killed = _.concat(log.killedBecauseCantRetreat, log.killedBecauseWounded);
            const units = killed.map(ut => unitTypes.get(ut));
            if (units.includes(dragon)) {
                playRandomAudio(soundsWhenDragonsAreDestroyed);
            }
            break;
        }
        case "retreat-casualties-suffered": {
            const units = log.units.map(ut => unitTypes.get(ut));
            if (units.includes(dragon)) {
                playRandomAudio(soundsWhenDragonsAreDestroyed);
            }
            break;
        }
    }
}

export function stopRunningSoundEffect(this: GameClient): void {
    if (currentlyPlayingAudio != null) {
        currentlyPlayingAudio.pause();
        currentlyPlayingAudio.currentTime = 0;
        currentlyPlayingAudio = null;
    }
}

function playRandomAudio(files: string[]): void {
    if (currentlyPlayingAudio != null) {
        return;
    }
    const randomFile = pickRandom(files);
    if (!randomFile) {
        return;
    }
    const audio = new Audio(randomFile);
    currentlyPlayingAudio = audio;
    audio.onended = () => currentlyPlayingAudio = null;
    audio.play();
}
