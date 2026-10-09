# Prompts (AI usage log)

AI assistant: Claude (Claude Code).

## Lab 1
- "Make lab 1: Figma design for the Crypto Portfolio Tracker, 4 pages, desktop and mobile."
  The assistant set up variables, text styles, grid styles and components in Figma and
  assembled the screens; I chose the topic and asked to replace the violet accent with gold.

## Lab 2
- "Make lab 2: HTML markup and semantics for the same project, keep it simple."
  The assistant generated the EJS partials, pages, image variants and the check script.
  Verification: `npm test` (lint, build, HTML validation, links, i18n keys) and the pages opened
  in a browser in English and with `?lang=uk`.

## Lab 3
- "Make lab 3: SCSS, responsive layout, architecture 7-1, BEM, for the same project."
  The assistant wrote the SCSS (tokens, functions, mixins, placeholders, 49 blocks, four pages, light theme), the
  Stylelint config and the check scripts. I decided to keep one project, to work without sub-agents and to reuse the
  Figma frames as the source of truth.
  Verification: `npm test`, screenshots at 360 / 768 / 1280 px in both themes compared with Figma, axe-core on every
  page, overflow check from 320 to 1920 px.

