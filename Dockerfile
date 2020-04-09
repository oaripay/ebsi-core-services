FROM node:12

# Create app directory
RUN mkdir -p /api
WORKDIR /api

# Bundle app source
COPY . /api

# Install app dependencies
RUN npm install

EXPOSE 8080
CMD sh start.sh

