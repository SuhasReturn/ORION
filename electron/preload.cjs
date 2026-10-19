/**
 * Preload script for ORION Electron desktop application.
 * Exposes minimal, strictly-isolated APIs to the renderer process.
 */
const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('orionDesktop', {
  isDesktop: true,
  platform: process.platform,
  version: '0.1.0',
})
