import { deleteExpiredFeedbackReports } from "./feedback-store.js";

export async function runFeedbackRetention(env, now = new Date()) {
  if (!env.FEEDBACK_DB) return { feedbackRemoved: 0 };
  return { feedbackRemoved: await deleteExpiredFeedbackReports(env.FEEDBACK_DB, now.toISOString()) };
}
