# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV YARN_ENABLE_TELEMETRY=0

RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/web/package.json apps/web/package.json
COPY packages packages
COPY services/api/package.json services/api/package.json

RUN yarn install --immutable

COPY . .

RUN test -n "$VITE_API_BASE_URL"
RUN yarn web:build

FROM nginx:stable-alpine

COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
