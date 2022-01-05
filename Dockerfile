FROM node:latest
WORKDIR /app
COPY . .
RUN curl -L "https://github.com/docker/compose/releases/download/v2.2.2/docker-compose-linux-armv7" -o /usr/local/bin/docker-compose
RUN chmod +x /usr/local/bin/docker-compose
RUN npm install
EXPOSE 8088
CMD [ "node", "central.js" ]
