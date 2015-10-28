FROM fedora:22

# Install dependencies
RUN dnf upgrade -y
RUN dnf install -y gcc-c++ make dnf-plugins-core redis mongodb mongodb-server krb5-devel krb5-libs

# Enable copr repo with more recent nodejs versions
RUN dnf -y copr enable nibbler/nodejs
RUN dnf -y install git nodejs nodejs-devel npm

# Start redis
RUN redis-server -p 6379 &

# Start mongodb
RUN mongod &

# Set nodejs environment
ENV NODE_ENV=production
ENV PORT=3000

# Install application
RUN rm -rf /srv
ADD . /srv
RUN ls -l /srv
WORKDIR /srv
RUN npm install
RUN ls -l /srv

EXPOSE 3000

CMD ["/usr/bin/node","/srv/examples/index.js"]