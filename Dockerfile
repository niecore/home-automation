FROM node:18
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Run the app
CMD [ "npm", "start" ]