# Utilise l'image Node.js officielle
FROM node:latest

# Définit le répertoire de travail dans le conteneur
WORKDIR /usr/src/app

# Copie les fichiers package.json et package-lock.json dans le conteneur
COPY package*.json ./

# Installe les dépendances du projet
RUN npm install

# Copie tous les fichiers du projet dans le conteneur
COPY . .

# Installe Ngrok et décompresse l'archive
RUN apt-get update && apt-get install -y wget && \
    wget https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip && \
    unzip ngrok-stable-linux-amd64.zip && \
    mv ngrok /usr/local/bin && \
    rm ngrok-stable-linux-amd64.zip

RUN ngrok authtoken "${NGROK_AUTHTOKEN}"

# Définir les variables d'environnement
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG JWT_SECRET
ARG MONGO_URI
ARG SESSION_SECRET
ARG GITHUB_CLIENT_ID
ARG GITHUB_SECRET
ARG MIRO_CLIENT_ID
ARG MIRO_SECRET
ARG DISCORD_CLIENT_ID
ARG DISCORD_SECRET
ARG MICROSOFT_CLIENT_ID
ARG MICROSOFT_SECRET
ARG SPOTIFY_CLIENT_ID
ARG SPOTIFY_SECRET
ARG REDDIT_CLIENT_ID
ARG REDDIT_SECRET
ARG TWITCH_CLIENT_ID
ARG TWITCH_SECRET
ARG NGROK_AUTHTOKEN

# Utiliser les variables d'environnement
ENV GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
ENV GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
ENV JWT_SECRET=$JWT_SECRET
ENV MONGO_URI=$MONGO_URI
ENV SESSION_SECRET=$SESSION_SECRET
ENV GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID
ENV GITHUB_SECRET=$GITHUB_SECRET
ENV MIRO_CLIENT_ID=$MIRO_CLIENT_ID
ENV MIRO_SECRET=$MIRO_SECRET
ENV DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID
ENV DISCORD_SECRET=$DISCORD_SECRET
ENV MICROSOFT_CLIENT_ID=$MICROSOFT_CLIENT_ID
ENV MICROSOFT_SECRET=$MICROSOFT_SECRET
ENV SPOTIFY_CLIENT_ID=$SPOTIFY_CLIENT_ID
ENV SPOTIFY_SECRET=$SPOTIFY_SECRET
ENV REDDIT_CLIENT_ID=$REDDIT_CLIENT_ID
ENV REDDIT_SECRET=$REDDIT_SECRET
ENV TWITCH_CLIENT_ID=$TWITCH_CLIENT_ID
ENV TWITCH_SECRET=$TWITCH_SECRET
ENV NGROK_AUTHTOKEN=$NGROK_AUTHTOKEN

# Expose les ports du conteneur
EXPOSE 8080 8084



# Démarre Ngrok et le serveur Node.js
CMD ngrok http --log=stdout 8080 & npm start


