#scp -O -r ./www/* root@192.168.1.11:/www/
rsync -avz --exclude='.DS_Store' ./www/ root@192.168.1.11:/www/
#tar --exclude='.DS_Store' -czf - -C ./www . | ssh root@192.168.1.11 "tar -xzf - -C /www"
#scp -O -r ./etc/init.d/pw root@192.168.1.11:/etc/init.d/
rsync -avz ./etc/init.d/pw root@192.168.1.11:/etc/init.d/