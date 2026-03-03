import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: { url: v.string(), secret: v.string(), events: v.array(v.string()) },
  handler: async (ctx, args) => {
    return await ctx.db.insert("webhooks", {
      url: args.url,
      secret: args.secret,
      events: args.events,
      createdAt: Date.now(),
      isActive: true,
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("webhooks").order("desc").collect();
  },
});

export const remove = mutation({
  args: { id: v.id("webhooks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const toggleActive = mutation({
  args: { id: v.id("webhooks"), isActive: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isActive: args.isActive });
  },
});

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("webhooks")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});
