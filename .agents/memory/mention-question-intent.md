---
name: Mention question intent
description: Durable behavior for questions that mention one or more Discord members.
---

When a message mentions a Discord member, the bot must interpret the whole question about that person or those people before applying its personality. Preference questions require a clear choice, opinion questions require an opinion, like/agreement questions require an explicit yes/no-style answer, and comparisons should address the mentioned targets. The roast or flattery comes afterward.

**Why:** Treating every message containing a mention as a generic roast caused answers to ignore questions such as who the bot prefers or what it thinks about a member.

**How to apply:** Resolve mentions to readable names, classify the question locally, instruct the model with the detected intent, and validate that an AI answer references the target and satisfies the requested answer type before sending it.