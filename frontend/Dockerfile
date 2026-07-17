FROM node:18-alpine

ENV PORT=3000
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

RUN npm install -g serve

EXPOSE 3000

CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:$PORT"]
