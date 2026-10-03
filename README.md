# ListingLab — Amazon Image Studio

A Vercel-ready MVP that turns reference product photos into a 10-image Amazon listing pack. The browser automatically optimizes large uploads before they are sent to the serverless API.

## What it generates

1. Amazon Main Image
2. 45° Product View
3. Alternate Angle
4. Detail Close-Up
5. Key Features Infographic
6. Dimensions Graphic
7. Lifestyle Use
8. Alternate Lifestyle
9. What's Included
10. Premium Hero

## AI stack

- Product analysis: OpenAI Responses API with `gpt-6-luna`
- Product-preserving image editing: `gpt-image-2.5-sunburst`
- Reference-image workflow through `POST /v1/images/edits`

## Required Vercel environment variable

`OPENAI_API_KEY`

Keep the key server-side. Never expose it in frontend JavaScript.

## Deploy

Import the repo into Vercel, add `OPENAI_API_KEY` in Project Settings → Environment Variables, then deploy.

## Upload handling

The UI accepts source images up to 10 MB each, then compresses reference copies in-browser to stay within serverless request-size constraints. Your original local files are not modified.

Deployment refreshed after production environment setup.
