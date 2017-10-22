FROM node:7-onbuild
# replace this with your application's default port
VOLUME ['/usr/src/app/data']
EXPOSE 9000
