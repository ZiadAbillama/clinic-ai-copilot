# syntax=docker/dockerfile:1.7

FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV YARN_ENABLE_TELEMETRY=0

RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/web/package.json apps/web/package.json
COPY packages packages
COPY services/api/package.json services/api/package.json

RUN yarn install --immutable

COPY . .

EXPOSE 3001

CMD ["yarn", "api:start"]
