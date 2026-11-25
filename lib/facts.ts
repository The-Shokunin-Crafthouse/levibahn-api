// The only facts the Q&A may speak from. Sourced 2026-10-22 from the resume,
// the elevator pitch, the shipped case-study teasers, and Levi's own notes.
// Edit here, nowhere else. Keep every line true and attributable.

export const FACTS = `
IDENTITY
- Levi Bahn, design leader. 20 years of hands-on craft that scaled into enterprise impact. B.F.A. Communication Design, Pratt Institute, 2005. Based in Colorado.
- Career arc: craft, then systems, then teams, then transformation. His own line: "I've never stopped being a designer. What changed is the scale."
- Runs The Shokunin Crafthouse, a solo studio where AI agents do the production work under his direction. Open to a senior design leadership role.

HEADLINE RESULTS
- Sallie Mae (Senior Director, Experience Design, 2023 to 2026): led the ground-up redesign of the flagship native app (iOS and Android) and the borrower web journey, unifying a fragmented multi-app experience into one B2C journey on a coherent design language and information architecture.
- Two separate results, never merge them: (1) the redesigned student loan marketing and application journeys contributed to a $2B increase in student loan originations; (2) the native app redesign for existing customers (borrowers already in repayment) reduced call-center operating cost by about $10M a year, by making the right answer findable before the customer picked up the phone.
- Redesigned the design-to-development handoff with agentic AI tooling: 40% of manual tasks removed, time to market cut 25%, with the team keeping ownership of the work.
- Took the enterprise design system from 30% to 100% adoption across the student lifecycle.
- AT&T (2017 to 2023, rising from Senior Lead Product Designer to Associate Director, CX Design): built the CX Design function from zero, growing it from 4 to 17 practitioners with craft standards, critique culture, and career paths. Architected Salesforce-based tooling so retail and call-center agents see what the customer sees. Led design strategy for AT&T One, international travel, and credit-policy digitization. Optimized DTVNow acquisition funnels.
- EveryWear (2016 to 2017, Lead Product Designer): end-to-end design for an AI/ML personal stylist product; led pitches that won work with Neiman Marcus, Bloomingdale's and Nordstrom.
- Sony Music (2010 to 2016, Art Director): directed UX for five white-label e-commerce platforms and artist stores for AC/DC, Miles Davis, the NFL and others.
- Freelance web, print and environmental graphics, 2005 to 2010.

THE BEHAVIOR LAYER
- A framework Levi originated at AT&T and refined since: embedding cognitive psychology (behavioral economics, UX laws, interaction patterns) into product decisions at the moment users make financial choices. His phrase: "Trust isn't a feeling, it's an architecture."
- Measurably increased user trust and the speed of financial decisions; became foundational to how his teams approached major interaction surfaces.
- Influenced by Growth.Design's catalogue of psychology principles (Dan Benoni and Louis-Xavier Lavoie's library). He has also built an AI skill, "The Behavior Layer", that grades each screen in a flow against 106 of those principles and names the ones it breaks; it is free to download from levibahn.com/behavior-layer and runs in Claude Code and Claude.ai.
- How he measures whether a nudge worked: he picks the business number before he picks the principle, ships the change with that metric defined up front, and measures until the change is statistically significant (see HOW HE WORKS). The four numbers he ties principles to: conversion, retention, effort (support calls, time on task) and completion.
- Where he draws the line between a nudge and a dark pattern: a nudge makes the choice the person would make anyway easier to make, and stays honest if the person reads every word; a dark pattern profits from the person not reading. His tests: the default is the option he would recommend to a friend; the total cost is as visible as the monthly cost; leaving is as easy as joining; scarcity and urgency are only ever true. He will not ship a screen that fails one of those, whatever it moves.
- The principle he reaches for first on a money decision: default bias, because most people keep the default, so the default has to be the recommendation. Then visual hierarchy (the number that matters is the biggest thing on the screen) and chunking (one question per step).
- The moments on levibahn.com/behavior-layer, each a real screen he designed, with the principles applied:
  - AT&T Mix & Match plan builder: chunking (one line at a time, each closed with a check), default bias (the recommended plan arrives selected), goal gradient (the header counts the sections down with the running total under it).
  - Rafa Racing Club event screen (design complete; the client pivoted, so its numbers are member-beta numbers): social proof (who is attending, with faces), goal gradient (your best lap next to the time to beat), commitment (one-tap paid registration), endowment (each member's car has its own hashtag identity).
  - The student lender's native app home screen: visual hierarchy (the amount due is the biggest thing on the screen, the date under it), spark effect (one yellow pay button at thumb height), feedforward (a card previews autopay before it is on: the date and the account).
  - The student lender's application: chunking (one topic per page with a running summary), framing (the repayment choice reads as a strategy in plain words, not a rate table), anchoring (the monthly cost shows first, with the term and the total it adds up to).

HOW HE LEADS
- Hands-on: he still designs, prototypes, and now directs AI agents to build. He reviews pixels, motion, and code, not just decks.
- Builds the infrastructure that makes good work repeatable: the team, the system, the standard. Critique culture as infrastructure.
- Works alone, embeds with a team, or assembles specialists for a problem, without agency overhead. "No decks, no big reveals, no ego."
- His closing question to hiring managers: "What's the hardest design problem your team is sitting on right now?"

HOW HE WORKS (his design process, the same at Sallie Mae, AT&T and in his studio; written by Levi 2026-10-31)
- Starts with the problem: maps the user journey, with insights and metrics for each touchpoint.
- Forms a hypothesis on where to focus the work and why. The why is a strategic business imperative or an unmet user need.
- Agrees scope in writing with cross-functional partners.
- Names the metric tied to the problem, its current value, and the target it should reach once the solution ships.
- Tests with users and iterates until new sessions stop surfacing new issues.
- After launch, measures until the change in the metric is statistically significant, and keeps iterating until the metric reaches its target.

CASE STUDIES ON THE SITE (five)
1. A national student lender's native app (hidden name until unlocked): "The right answer, before the phone call." Ground-up iOS and Android redesign, 2023 to 2026.
2. A national student lender's application journey (hidden name until unlocked): "Apply with your eyes open." Marketing through application and servicing, 2023 to 2026.
3. AT&T Mix & Match: "Everyone can choose their own plan. It's that simple." Wireless plan, line configuration, checkout, confirmation; pricing a customer can reason about.
4. An art-curation concept app (hidden name until unlocked): "Scan the room. Meet its art." A LiDAR-driven prototype that scans a room and recommends art for it. Self-directed concept.
5. Rafa Racing Club (for Orbus Innovation, Oct 2022 to Dec 2023): "Race day has a new home." Bespoke member platform: iOS app, web admin, consumer web, with its own design system. Design complete; the client pivoted.

WHAT HE IS BUILDING RIGHT NOW
- Kata, an iOS photo app: it makes your photos better, instantly. It learns a person's editing style from the already-edited photos in their camera roll and applies it, aiming for accuracy high enough that no one needs to edit photos again, and keeps learning from re-edits. Built with AI agents under Levi's direction.
- Also built with AI in the studio: ai.levibahn.com (his AI workflow site), Studio PM (a native macOS board for directing agent work), Money Bags, a dual investment app, Copper & Quartz, Meg's Playbook (a private social-media co-pilot), a personal health dashboard, and a client portal.

CONTACT
- The site's "text me" prompt and LinkedIn (linkedin.com/in/levibahn). Do not give out a phone number or email.
`;
