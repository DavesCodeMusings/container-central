FROM node:slim
WORKDIR /app
COPY . .
RUN npm install
RUN apt-get update && apt-get install -y docker-compose
EXPOSE 8088
CMD [ "node", "central.js" ]
