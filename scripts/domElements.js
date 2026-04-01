// scripts/domElements.js
/**
 * @module domElements
 * Lưu trữ và cung cấp các tham chiếu đến các phần tử DOM quan trọng.
 */

export const elements = {
  themeControls: null,
  navToggle: null,
  navModal: null,
  navModalContent: null,
  navModalCloseBtn: null,
  navOpenIcon: null,
  navCloseIcon: null,
  contentDiv: null,
  navModalPlaceholder: null,
  playlistToggleBtn: null,
  playlistModal: null,
  playlistModalList: null,
  playlistCloseBtn: null,

  // Dock Elements
  dockToggleBtn: null,
  dockCollapseIcon: null,
  dockExpandIcon: null,
  dockCollapsibleContent: null,
  floatingDock: null, // [NEW] Container trôi nổi của thanh player

  // ToC Modal
  tocToggleBtn: null,
  tocModal: null,
  tocModalList: null,
  tocModalCloseBtn: null,

  // History Modal
  historyToggleBtn: null,
  historyModal: null,
  historyModalList: null,
  historyModalCloseBtn: null,
  historyClearBtn: null,

  // Settings Modal
  settingsModal: null,
  settingsCloseBtn: null,

  // Mobile Drawer
  mobileControlsTrigger: null,
  mobileControlsDrawer: null,
  drawerOverlay: null,
  drawerContent: null,
  drawerCloseBtn: null,
  drawerButtonsContainer: null,

  // Global Player Elements
  globalPlayer: {
    container: null,
    audio: null,
    playPauseBtn: null,
    nextBtn: null,
    settingsBtn: null,
    playbackRateControls: null,
    playbackModeControls: null,
    progressContainer: null,
    progressBar: null,
    currentTimeEl: null,
    durationTimeEl: null,
    titleEl: null,
  },

  // Bottom Navigation Bar Elements
  bottomNavBar: null,
  bottomNavContent: null,

  // [NEW] Font Size Controls
  desktopFontSlider: null,
  mobileFontSlider: null,

};

/**
 * Gán các phần tử DOM vào đối tượng `elements`.
 */
export function assignElements() {
  elements.themeControls = document.getElementById("theme-controls");
  elements.navToggle = document.getElementById("nav-toggle");
  elements.navModal = document.getElementById("nav-modal");
  elements.navModalContent = document.getElementById("nav-modal-content");
  elements.navModalCloseBtn = document.getElementById("nav-modal-close-btn");
  elements.navOpenIcon = document.getElementById("nav-open-icon");
  elements.navCloseIcon = document.getElementById("nav-close-icon");
  elements.contentDiv = document.getElementById("content");
  elements.navModalPlaceholder = document.getElementById(
    "nav-modal-placeholder"
  );

  elements.playlistToggleBtn = document.getElementById("playlist-toggle-btn");
  elements.playlistModal = document.getElementById("playlist-modal");
  elements.playlistModalList = document.getElementById("playlist-modal-list");
  elements.playlistCloseBtn = document.getElementById("playlist-close-btn");

  elements.tocToggleBtn = document.getElementById('toc-toggle-btn');
  elements.tocModal = document.getElementById('toc-modal');
  elements.tocModalList = document.getElementById('toc-modal-list');
  elements.tocModalCloseBtn = document.getElementById('toc-modal-close-btn');

  // Dock Elements
  elements.dockToggleBtn = document.getElementById('dock-toggle-btn');
  elements.dockCollapseIcon = document.getElementById('dock-collapse-icon');
  elements.dockExpandIcon = document.getElementById('dock-expand-icon');
  elements.dockCollapsibleContent = document.getElementById('dock-collapsible-content');
  elements.floatingDock = document.getElementById('floating-dock-container'); // [NEW]

  // Assign Settings Modal Elements
  elements.settingsModal = document.getElementById('settings-modal');
  elements.settingsCloseBtn = document.getElementById('settings-close-btn');

  // History Elements
  elements.historyToggleBtn = document.getElementById('history-toggle-btn');
  elements.historyModal = document.getElementById('history-modal');
  elements.historyModalList = document.getElementById('history-modal-list');
  elements.historyModalCloseBtn = document.getElementById('history-modal-close-btn');
  elements.historyClearBtn = document.getElementById('history-clear-btn');

  // Assign Mobile Drawer Elements
  elements.mobileControlsTrigger = document.getElementById('mobile-controls-trigger');
  elements.mobileControlsDrawer = document.getElementById('mobile-controls-drawer');
  elements.drawerOverlay = document.getElementById('drawer-overlay');
  elements.drawerContent = document.getElementById('drawer-content');
  elements.drawerCloseBtn = document.getElementById('drawer-close-btn');
  elements.drawerButtonsContainer = document.getElementById('drawer-buttons-container');

  // Assign Global Player Elements
  const gp = elements.globalPlayer;
  gp.container = document.getElementById('player-dock');
  gp.audio = document.getElementById('global-audio-element');
  gp.playPauseBtn = document.getElementById('global-play-pause-btn');
  gp.nextBtn = document.getElementById('global-next-btn');
  gp.settingsBtn = document.getElementById('global-settings-btn');
  gp.playbackRateControls = document.getElementById('playback-rate-controls');
  gp.playbackModeControls = document.getElementById('playback-mode-controls');
  gp.progressContainer = document.getElementById('global-progress-container');

  gp.progressBar = document.getElementById('global-progress-bar');
  gp.currentTimeEl = document.getElementById('global-current-time');
  gp.durationTimeEl = document.getElementById('global-duration-time');
  gp.titleEl = document.getElementById('global-audio-title');

  // Assign Bottom Navigation Bar Elements
  elements.bottomNavBar = document.getElementById('bottom-nav-bar');
  elements.bottomNavContent = document.getElementById('bottom-nav-content');

  // [NEW] Assign Font Size Controls
  elements.desktopFontSlider = document.querySelector('#desktop-font-controls .font-size-slider');
  elements.mobileFontSlider = document.querySelector('#mobile-font-controls .font-size-slider');
}