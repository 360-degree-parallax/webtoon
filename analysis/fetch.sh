#!/bin/bash
# usage: fetch.sh titleId no outdir
t=$1; n=$2; o=$3; mkdir -p $o/$n; cd $o/$n
curl -s -A 'Mozilla/5.0' "https://comic.naver.com/webtoon/detail?titleId=$t&no=$n" -o page.html
grep -o "https://image-comic.pstatic.net/webtoon/$t/$n/[^\"]*IMAG01_[0-9]*\.jpg" page.html | awk '!s[$0]++' > urls.txt
i=0; while read u; do i=$((i+1)); curl -s -A 'Mozilla/5.0' -e "https://comic.naver.com/" "$u" -o $(printf '%03d.jpg' $i); done < urls.txt
python3 -I - <<'P'
from PIL import Image;import glob
fs=sorted(glob.glob('[0-9][0-9][0-9].jpg'));ims=[Image.open(f).convert('RGB') for f in fs]
w=ims[0].width;H=sum(i.height for i in ims);S=Image.new('RGB',(w,H));y=0
for i in ims:S.paste(i,(0,y));y+=i.height
S.save('strip.png');print(len(fs),w,H)
P
