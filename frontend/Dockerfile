#FROM node:25-alpine
#COPY package*.json /app/
#RUN npm install
#COPY . /app/
#WORKDIR /app
##RUN chown -R node:node /app
## Switch to the built-in non-root "node" user
##USER node
#EXPOSE 5173
#CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


FROM node:25-alpine

WORKDIR /app

COPY package*.json ./

RUN npm cache clean --force
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]