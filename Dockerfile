FROM node:12

# Create app directory
RUN mkdir -p /api
WORKDIR /api

# Bundle app source
COPY . .


# Install app dependencies
RUN npm install

RUN npm run build

EXPOSE 9000
CMD sh start.sh
