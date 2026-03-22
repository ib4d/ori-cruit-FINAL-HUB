/// <reference types="vite/client" />

/**
 * API Configuration
 * 
 * In development (local): Uses relative paths that work with the Express server on the same origin
 * In production split deployment (Vercel + Railway): Uses environment variables to point to Railway backend
 */

export const API_BASE = import.meta.env.VITE_API_URL || window.location.origin;
export const WS_BASE = import.meta.env.VITE_WS_URL || 
  (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host;

/**
 * API fetch wrapper
 * Ensures all API calls use the configured base URL
 */
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = new URL(endpoint, API_BASE).toString();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

/**
 * Get WebSocket URL with fallback to same origin
 */
export function getWebSocketUrl(): string {
  return WS_BASE;
}
