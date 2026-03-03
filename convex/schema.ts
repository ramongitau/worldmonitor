import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  registrations: defineTable({
    email: v.string(),
    normalizedEmail: v.string(),
    registeredAt: v.number(),
    source: v.optional(v.string()),
    appVersion: v.optional(v.string()),
  }).index("by_normalized_email", ["normalizedEmail"]),
  apiKeys: defineTable({
    key: v.string(),
    name: v.string(),
    createdAt: v.number(),
    isActive: v.boolean(),
  }).index("by_key", ["key"]),
  webhooks: defineTable({
    url: v.string(),
    secret: v.string(),
    events: v.array(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_active", ["isActive"]),
});
