#scp -O -r ./www/* root@192.168.1.11:/www/
rsync -avz --exclude='.DS_Store' ./www/ root@192.168.11.1:/www/
#tar --exclude='.DS_Store' -czf - -C ./www . | ssh root@192.168.1.11 "tar -xzf - -C /www"
#scp -O -r ./etc/init.d/pw root@192.168.1.11:/etc/init.d/
rsync -avz ./etc/* root@192.168.11.1:/etc/
rsync -avz ./stage1/* root@192.168.11.1:/root/stage1/
rsync -avz ./stage2/* root@192.168.11.1:/root/stage2/
rsync -avz ./etc/init.d/pw root@192.168.11.1:/etc/init.d/
#rsync -avz ./installer-apk.sh root@192.168.11.1:/root/installer-apk.sh