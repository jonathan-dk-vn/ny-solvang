// scripts/audioUtils.js
/**
 * @module audioUtils
 * Các hàm tiện ích liên quan đến audio và điều khiển phát lại nâng cao.
 */

export function pauseOtherAudios(currentAudio) {
  document.querySelectorAll("audio.audio-player").forEach((audio) => {
    if (audio !== currentAudio) {
      audio.pause();
    }
  });
}

export function seekAudio(audioPlayer, seconds) {
  if (!audioPlayer) return;
  audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime + seconds);
}

/**
 * Đặt tốc độ phát cho audio player.
 * @param {HTMLAudioElement} audioPlayer 
 * @param {number} rate 
 */
export function setPlaybackRate(audioPlayer, rate) {
    if (audioPlayer) {
        audioPlayer.playbackRate = rate;
    }
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export function updateTimeDisplay(audioPlayer, currentTimeSpan, durationSpan) {
  if (!audioPlayer || !currentTimeSpan || !durationSpan) return;
  currentTimeSpan.textContent = formatTime(audioPlayer.currentTime);
  if (isFinite(audioPlayer.duration)) {
    durationSpan.textContent = formatTime(audioPlayer.duration);
  }
}

export function handleTimeUpdate(audioPlayer, progressBar, currentTimeSpan, durationSpan) {
  if (!audioPlayer || !progressBar || !isFinite(audioPlayer.duration) || audioPlayer.duration <= 0) return;
  progressBar.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
  updateTimeDisplay(audioPlayer, currentTimeSpan, durationSpan);
}

export function handleLoadedMetadata(audioPlayer, progressBar, durationSpan) {
    if (!audioPlayer || !progressBar || !durationSpan) return;
    updateTimeDisplay(audioPlayer, progressBar.parentElement.querySelector('.current-time'), durationSpan);
}

export function handleProgressBarChange(event, audioPlayer) {
  if (!audioPlayer || !isFinite(audioPlayer.duration) || audioPlayer.duration <= 0) return;
  audioPlayer.currentTime = (event.target.value / 100) * audioPlayer.duration;
}