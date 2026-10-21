import admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { type NextFunction, type Request, type Response } from "express";

// Tell Typescript that REquest has a user
declare module "express-serve-static-core" {
  interface Request {
    user?: {
      email?: string;
      picture?: string;
    };
  }
}

export async function authorized(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionCookie = req.cookies.session || "";
    const decoded = await getAuth().verifySessionCookie(sessionCookie, true);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY ?? process.env.VITE_FIREBASE_API_KEY,
  authDomain: `${process.env.FIREBASE_PROJECT_ID ?? process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.FIREBASE_PROJECT_ID ?? process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.FIREBASE_PROJECT_ID ?? process.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: process.env.FIREBASE_SENDER_ID ?? process.env.VITE_FIREBASE_SENDER_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID ?? process.env.VITE_FIREBASE_MEASUREMENT_ID,
  appId: process.env.FIREBASE_APP_ID ?? process.env.VITE_FIREBASE_APP_ID
}

if (!firebaseConfig.apiKey) {
  console.warn("Firebase client configuration is missing. Please set the environment variables: FIREBASE_API_KEY, FIREBASE_PROJECT_ID, FIREBASE_SENDER_ID, and FIREBASE_APP_ID.");
}