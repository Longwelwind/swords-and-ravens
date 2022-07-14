export default function fadeOutAudio (sound?: HTMLAudioElement): void {
    if (!sound) {
        return;
    }

    sound.onloadedmetadata = function() {
        const fadePoint = sound.duration - 5;

        const fadeAudio = window.setInterval(function () {
            // Only fade if past the fade out point or not at zero already
            if ((sound.currentTime >= fadePoint) && (sound.volume >= 0.04)) {
                sound.volume -= 0.04;
            }
            // When volume at zero stop all the intervalling
            if (sound.volume <= 0.04) {
                window.clearInterval(fadeAudio);
            }
        }, 200);
    };
}
