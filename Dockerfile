FROM fedora:22

# Install dependencies
RUN dnf upgrade -y
RUN dnf install -y gcc-c++ make dnf-plugins-core

# Enable copr repo with more recent nodejs versions
RUN dnf -y copr enable nibbler/nodejs
RUN dnf -y install git nodejs nodejs-devel npm


# Set nodejs environment
ENV NODE_ENV=production
ENV PORT=3000
ENV SECRET=someRealyLongStringToMakeHackersSad
ENV HOST_URL=http://myhuntjsapp.local
ENV ADMIN_EMAIL=my.mail@mymail.com
ENV HUNTJS_ADDR=0.0.0.0
ENV REDIS_URL=redis://huntjs:someRedisAuth@redis.local:6379
ENV MONGO_URL=mongodb://dbuser:dbpasswd@mongodb.local/dbname
ENV GOOGLE_CLIENT_ID=
ENV GOOGLE_CLIENT_SECRET=
ENV GITHUB_CLIENT_ID=
ENV GITHUB_CLIENT_SECRET=
ENV TWITTER_CONSUMER_KEY=
ENV TWITTER_CONSUMER_SECRET=
ENV FACEBOOK_APP_ID=
ENV FACEBOOK_APP_SECRET=
ENV VK_APP_ID=
ENV VK_APP_SECRET=


# Install application
RUN rm -rf /srv
ADD . /srv
RUN ls -l /srv
WORKDIR /srv
RUN npm install
RUN ls -l /srv

EXPOSE 3000

CMD ["/usr/bin/node","/srv/examples/index.js"]