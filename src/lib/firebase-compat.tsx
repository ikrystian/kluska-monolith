'use client';

/**
 * Firebase Compatibility Layer
 *
 * This file provides compatibility wrappers for Firebase functions
 * to work with MongoDB during the migration period.
 *
 * TEMPORARY FILE - Will be removed after full migration
 */

import React from 'react';
import { signOut as nextAuthSignOut } from 'next-auth/react';

// Re-export MongoDB hooks as Firebase hooks for compatibility
export { useUser, useDoc } from '@/lib/db-hooks';

// Compatibility wrapper for useCollection that accepts null/undefined
export function useCollection<T = any>(query: any) {
  // For now, return empty array when query is null
  // This needs to be updated to properly handle MongoDB queries
  return {
    data: null as T[] | null,
    isLoading: false,
    error: null,
  };
}

/**
 * Compatibility wrapper for useFirestore
 * Returns null since we don't use Firestore anymore
 */
export function useFirestore() {
  return null;
}

/**
 * Compatibility wrapper for useAuth
 * Returns null since we use NextAuth now
 */
export function useAuth() {
  return null;
}

/**
 * Compatibility wrapper for useFirebaseApp
 * Returns null since we don't use Firebase anymore
 */
export function useFirebaseApp() {
  return null;
}

/**
 * Compatibility wrapper for useMemoFirebase
 * Just returns the factory result without Firebase-specific logic
 */
export function useMemoFirebase<T>(factory: () => T, deps: React.DependencyList): T {
  return React.useMemo(factory, deps);
}

/**
 * Compatibility wrapper for signOut
 * Uses NextAuth signOut instead of Firebase
 */
export async function signOut() {
  await nextAuthSignOut({ redirect: false });
}

// Firestore compatibility stubs - silently return null to avoid console spam
export function doc(...args: any[]) {
  return null;
}

export function collection(...args: any[]) {
  return null;
}

export function query(...args: any[]) {
  return null;
}

export function where(...args: any[]) {
  return null;
}

export function orderBy(...args: any[]) {
  return null;
}

export function limit(...args: any[]) {
  return null;
}

export function setDoc(...args: any[]) {
  return Promise.resolve();
}

export function updateDoc(...args: any[]) {
  return Promise.resolve();
}

export function deleteDoc(...args: any[]) {
  return Promise.resolve();
}

export function addDoc(...args: any[]) {
  return Promise.resolve({ id: 'temp-id' });
}

export function getDoc(...args: any[]) {
  return Promise.resolve({ exists: () => false, data: () => null });
}

export function getDocs(...args: any[]) {
  return Promise.resolve({ docs: [] });
}

export function serverTimestamp() {
  return new Date();
}

export function increment(value: number) {
  return value;
}

export function writeBatch(...args: any[]) {
  return {
    set: () => {},
    update: () => {},
    delete: () => {},
    commit: () => Promise.resolve(),
  };
}

// Firebase Storage compatibility stubs
export function getStorage(...args: any[]) {
  return null;
}

export function ref(...args: any[]) {
  return null;
}

export function uploadBytes(...args: any[]) {
  return Promise.resolve({ ref: null, metadata: {} });
}

export function getDownloadURL(...args: any[]) {
  return Promise.resolve('');
}

// Timestamp compatibility
export class Timestamp {
  constructor(public seconds: number, public nanoseconds: number) {}

  toDate() {
    return new Date(this.seconds * 1000);
  }

  static now() {
    const now = Date.now();
    return new Timestamp(Math.floor(now / 1000), (now % 1000) * 1000000);
  }

  static fromDate(date: Date) {
    const ms = date.getTime();
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1000000);
  }
}

