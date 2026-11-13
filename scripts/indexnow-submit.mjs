// IndexNow 제출(D-168): Bing, Naver, Yandex 등 IndexNow 참여 검색엔진에 사이트맵 주소를 한 번에 알린다.
// ChatGPT 검색은 Bing 색인을 쓰므로 AI 노출에 직접 영향이 있다. 배포 후 대표 맥에서: node scripts/indexnow-submit.mjs
// 키 파일: public/ec422a9a97bf2e8590ee8fe3168b85ce.txt (https://mtspace.coffee/ec422a9a97bf2e8590ee8fe3168b85ce.txt)
const KEY = "ec422a9a97bf2e8590ee8fe3168b85ce";
const HOST = "mtspace.coffee";
const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
if (!urls.length) { console.error("sitemap 에서 주소를 찾지 못했습니다"); process.exit(1); }
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
});
console.log("IndexNow", res.status, res.statusText, "urls:", urls.length);
