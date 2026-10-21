import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, logEvent, type Analytics } from 'firebase/analytics';
import config from "./config";

let app: Promise<FirebaseApp> = new Promise((resolve, reject) => {
  fetch('/api/auth/firebase-config.json')
    .then(res => res.json())
    .then(config => {
      resolve(initializeApp(config));
    })
    .catch(error => {
      console.error("Failed to load Firebase config:", error);
      reject(error);
    });
});

let analytics: Promise<Analytics> = app.then(appInstance => {
  return getAnalytics(appInstance);  
}).catch(error => {
  console.error("Failed to initialize Firebase Analytics:", error);
  throw error;
});

export async function loadAnalytics(): Promise<Analytics> {
  return analytics;
}

export async function logPageOpenedEvent(location: string): Promise<void> {
  try {
    const analyticsInstance = await loadAnalytics();
    logEvent(analyticsInstance, 'page_view', { page_location: location, app_id: config.appId });
  } catch (error) {
    console.error("Failed to log page opened event:", error);
  }
}

export async function logItemShown(id: string, category?: string): Promise<void> {
  try {
    const analyticsInstance = await loadAnalytics();
    logEvent(analyticsInstance, 'select_content', { content_id: id, content_type: category, app_id: config.appId });
  } catch (error) {
    console.error("Failed to log item shown event:", error);
  }
}
