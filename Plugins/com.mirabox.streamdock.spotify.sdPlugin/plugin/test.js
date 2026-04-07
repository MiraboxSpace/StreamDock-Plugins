let getSongLyric = async (songmid, parse = false, origin = false) => {
    let res = await fetch("https://i.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=SONGMID&g_tk=5381&format=json&inCharset=utf8&outCharset=utf-8&nobase64=1".replaceAll("SONGMID", songmid));
    res = await res.json();

    console.log(res);
};
async function sss() {
    console.log(await getSongLyric(97773));
}
sss();
