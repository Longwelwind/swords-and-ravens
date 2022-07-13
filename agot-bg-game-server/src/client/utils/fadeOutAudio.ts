export default function fadeOutAudioById (audioId: string): void {
    const sound = document.getElementById(audioId) as HTMLAudioElement;

    if (!sound) {
        return;
    }

    // Our audios have a length of 16-17 seconds. So lets begin fading at 11
    const fadePoint = 11;

    const fadeAudio = window.setInterval(function () {
        // Only fade if past the fade out point or not at zero already
        if ((sound.currentTime >= fadePoint) && (sound.volume >= 0.05)) {
            sound.volume -= 0.05;
        }
        // When volume at zero stop all the intervalling
        if (sound.volume <= 0.05) {
            window.clearInterval(fadeAudio);
        }
    }, 200);
}

export function fadeOutAudio(sound: HTMLAudioElement): void {
    // Our audios have a length of 16-17 seconds. So lets begin fading at 11
    const fadePoint = 11;

    const fadeAudio = window.setInterval(function () {
        // Only fade if past the fade out point or not at zero already
        if ((sound.currentTime >= fadePoint) && (sound.volume >= 0.05)) {
            sound.volume -= 0.05;
        }
        // When volume at zero stop all the intervalling
        if (sound.volume <= 0.05) {
            window.clearInterval(fadeAudio);
        }
    }, 200);
}