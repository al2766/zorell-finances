import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

export async function signInWithGoogle(): Promise<User | null> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ login_hint: 'mo.alseli@gmail.com' })
  try {
    const result = await signInWithPopup(auth, provider)
    return result.user
  } catch (e) {
    console.error('Google sign-in error:', e)
    return null
  }
}

export function signOutUser() {
  return signOut(auth)
}

export function onAuth(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb)
}

// ── Firestore sync ────────────────────────────────────────────────

export interface FinanceSnapshot {
  settings?: unknown
  sliders?: unknown
  customBills?: unknown
  billDayOverrides?: unknown
  balanceOverrides?: unknown
  billContribOverrides?: unknown
  weekendStates?: unknown
  carryToggles?: unknown
  dayTypeOverrides?: unknown
  savedAt?: string
}

export async function loadFromFirestore(uid: string): Promise<FinanceSnapshot | null> {
  try {
    const ref = doc(db, 'finance-data', uid)
    const snap = await getDoc(ref)
    return snap.exists() ? (snap.data() as FinanceSnapshot) : null
  } catch (e) {
    console.error('Firestore load error:', e)
    return null
  }
}

export async function saveToFirestore(uid: string, data: FinanceSnapshot): Promise<void> {
  try {
    const ref = doc(db, 'finance-data', uid)
    await setDoc(ref, { ...data, savedAt: new Date().toISOString() }, { merge: true })
  } catch (e) {
    console.error('Firestore save failed', e)
  }
}
