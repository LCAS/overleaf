/bin/sh
wget -qO- https://get.docker.com/ | sh
apt-get install poppler-utils vim ghostscript --yes
npm rebuild
usermod -aG docker app

cp /app/bin/synctex /app/bin/synctex-mount/synctex

