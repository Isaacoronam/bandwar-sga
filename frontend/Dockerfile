FROM node:22-alpine

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ENV PORT=3000
WORKDIR /app

COPY . /tmp/build-context

RUN if [ -f /tmp/build-context/package.json ]; then \
        cp /tmp/build-context/package.json /app/package.json; \
        if [ -f /tmp/build-context/package-lock.json ]; then cp /tmp/build-context/package-lock.json /app/package-lock.json; fi; \
    else \
        cp /tmp/build-context/frontend/package.json /app/package.json; \
        if [ -f /tmp/build-context/frontend/package-lock.json ]; then cp /tmp/build-context/frontend/package-lock.json /app/package-lock.json; fi; \
    fi \
    && if [ -d /tmp/build-context/frontend ]; then \
        cp -r /tmp/build-context/frontend/. /app/; \
    else \
        cp -r /tmp/build-context/. /app/; \
    fi \
    && rm -rf /tmp/build-context

RUN npm install
RUN npm run build
RUN npm install -g serve

EXPOSE 3000

CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:$PORT"]
