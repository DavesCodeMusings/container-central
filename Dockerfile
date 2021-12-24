FROM node:slim
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 8088
CMD [ "node", "central.js" ]
