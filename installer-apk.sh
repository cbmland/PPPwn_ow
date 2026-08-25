#!/bin/sh
echo ">>> [1/7] 开始更新系统源并安装必要的依赖 (基于 apk)..."
apk update
apk add unzip curl rp-pppoe-common rp-pppoe-server

echo ">>> [2/7] 下载原版 PPPwn_ow 网页前端和配置文件..."
cd /tmp
wget -O pppwn_ow.zip https://github.com/cbmland/PPPwn_ow/archive/refs/heads/main.zip
unzip -o pppwn_ow.zip
cd PPPwn_ow-main

echo ">>> [3/7] 正在将配置文件和 Web 前端移动到系统目录..."
# 移动核心配置和服务脚本
cp etc/config/pw /etc/config/
cp etc/config/pppoe /etc/config/
cp etc/init.d/pppoe-server /etc/init.d/
cp etc/init.d/pw /etc/init.d/
cp -r etc/ppp/* /etc/ppp/

# 移动 Web 前端文件
mkdir -p /www/cgi-bin
cp www/cgi-bin/pw.cgi /www/cgi-bin/
cp www/pppwn.html /www/
cp -r www/assets /www/

echo ">>> [4/7] 正在修复原作者反人类的硬编码路径问题 (多目录饱和式覆盖)..."
# 创建自定义 payload 目录
mkdir -p /etc/pppwn /www/pppwn/payloads

# 填满 /root/ 目录 (破解原作者 CGI 里的硬编码读取)
cp version /root/
cp -r stage1 /root/
cp -r stage2 /root/

# 填满 /www/cgi-bin/ 目录 (兜底网页相对路径)
cp version /www/cgi-bin/
cp -r stage1 /www/cgi-bin/
cp -r stage2 /www/cgi-bin/

# 填满 /etc/pppwn/ 目录 (备用系统配置目录)
cp version /etc/pppwn/
cp -r stage1 /etc/pppwn/
cp -r stage2 /etc/pppwn/

echo ">>> [5/7] 正在修复启动脚本中的 Bash 语法不兼容 Bug (Ash 环境替换)..."
sed -i 's/if \[\[ "$result" == \*"\\\[\\+\] Done\\!"\* \]\]; then/if echo "$result" | grep -Fq "[+] Done!"; then/g' /etc/init.d/pw

echo ">>> [6/7] 正在下载最新的底层攻击武器 (xfangfang v1.1.0 mipsel-musl)..."
cd /tmp
wget -O pppwn-musl.zip https://github.com/xfangfang/PPPwn_cpp/releases/download/1.1.0/mipsel-linux-musl.zip
mkdir -p pppwn_update
unzip -o pppwn-musl.zip -d pppwn_update
cd pppwn_update

# 拆解 .tar.gz 套娃并安装核心程序
tar -xzf pppwn.tar.gz
mv pppwn /usr/sbin/pppwn

echo ">>> [7/7] 正在赋予系统权限、清理垃圾并启动服务..."
# 赋予核心程序、服务脚本最高执行权限
chmod +x /usr/sbin/pppwn
chmod +x /etc/init.d/pppoe-server
chmod +x /etc/init.d/pw
chmod +x /www/cgi-bin/pw.cgi
chmod 600 /etc/ppp/pap-secrets /etc/ppp/chap-secrets

# 赋予固件版本列表和载荷读取权限
chmod -R 777 /root/stage1 /root/stage2 /root/version
chmod -R 777 /www/cgi-bin/stage1 /www/cgi-bin/stage2 /www/cgi-bin/version
chmod -R 777 /etc/pppwn/stage1 /etc/pppwn/stage2 /etc/pppwn/version

# 删除临时缓存垃圾
cd /tmp
rm -rf PPPwn_ow-main pppwn_ow.zip pppwn_update pppwn-musl.zip

# 开启开机自启并启动后台监听进程
/etc/init.d/pppoe-server enable
/etc/init.d/pw enable
/etc/init.d/pw start

echo "=========================================================="
echo "🎯 PPPwn 环境终极修复版部署完成！"
echo "👉 请在电脑浏览器访问：http://192.168.1.1/pppwn.html"
echo "=========================================================="