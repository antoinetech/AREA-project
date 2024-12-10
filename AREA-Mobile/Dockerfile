FROM node:latest

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

RUN npm install -g @expo/ngrok

COPY . .

EXPOSE 8085

CMD ["npx", "expo", "start", "-c", "--port", "8085"]