FROM node:latest
WORKDIR /app
COPY . .
RUN case $(uname -m) in \
      arm*) curl -L "https://github.com/docker/compose/releases/download/v2.2.3/docker-compose-linux-armv7" -o /usr/local/bin/docker-compose ;; \
      x86*) curl -L "https://github.com/docker/compose/releases/download/v2.2.3/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose ;; \
    esac
RUN chmod +x /usr/local/bin/docker-compose
RUN npm install
EXPOSE 8088
CMD [ "node", "central.js" ]
