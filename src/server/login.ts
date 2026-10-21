import express, { type Request, type Response } from "express";
import admin, { type ServiceAccount } from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { cert, initializeApp } from "firebase-admin/app";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import config from "./config";
import { authorized, firebaseConfig } from "./auth";

const dir = dirname(fileURLToPath(import.meta.url))
const accountFile = ['/app/data/serviceAccount.json', resolve(dir, './serviceAccount.json')].find(fs.existsSync)

console.log(`Using service account from ${accountFile}`)

if (!accountFile) {
  console.warn("Service account file not found. Please provide a valid service account JSON file for Admin page to work.");
} else {
  const serviceAccount = JSON.parse(fs.readFileSync(accountFile, 'utf8')) as ServiceAccount

  initializeApp({
    credential: cert(serviceAccount)
  });
}

const api = express.Router();

api.post("/auth", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const decoded = await getAuth().verifyIdToken(token);
    
    console.log(`Token verified for ${decoded.email}`); 

    if (!config.admins.includes(decoded.email!)) {
      console.error(`Unauthorized access attempt by ${decoded.email}`);
      return res.status(403).json({ error: "Access denied" });
    }

    console.log(`User ${decoded.email} authenticated. Creating ${config.secureCookie ? 'secure' : 'dev' } session cookie`);

    const sessionCookie = await getAuth().createSessionCookie(token, { expiresIn: config.sessionExpiration });

    res.cookie("session", 
      sessionCookie, 
      { httpOnly: true, secure: config.secureCookie, maxAge: config.sessionExpiration }
    ).json({ uid: decoded.uid, email: decoded.email });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

api.get("/auth/firebase-config.json", (req: Request, res: Response) => {
  res.json(firebaseConfig);
});

api.get("/user", authorized, async (req: Request, res: Response) => {
  console.log(`Fetching user profile for ${req.user?.email}`);
  res.json(req.user);
});

api.get("/auth/logout", (req: Request, res: Response) => {
  console.log(`Logging out user ${req.user?.email}`);
  res.clearCookie("session");
  res.redirect("/admin/");
});


export default api;