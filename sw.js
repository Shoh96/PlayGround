const CACHE = 'scripture-quest-b11a212d0c';
const PRECACHE = [
  "/",
  "/index.html",
  "/assets/cormorant-garamond-cyrillic-400-italic-AH1vqu4S.woff",
  "/assets/cormorant-garamond-cyrillic-400-italic-D3GtrbRZ.woff2",
  "/assets/cormorant-garamond-cyrillic-400-normal-CVFrM67f.woff",
  "/assets/cormorant-garamond-cyrillic-400-normal-DD2KOZkl.woff2",
  "/assets/cormorant-garamond-cyrillic-500-italic-C9gO-8KC.woff",
  "/assets/cormorant-garamond-cyrillic-500-italic-DVnfXoMy.woff2",
  "/assets/cormorant-garamond-cyrillic-500-normal-CyAY5ZLS.woff2",
  "/assets/cormorant-garamond-cyrillic-500-normal-DkJXBcIH.woff",
  "/assets/cormorant-garamond-cyrillic-600-normal-C2atO-64.woff2",
  "/assets/cormorant-garamond-cyrillic-600-normal-FNmA3REe.woff",
  "/assets/cormorant-garamond-cyrillic-700-normal-D3uyJ5DH.woff",
  "/assets/cormorant-garamond-cyrillic-700-normal-SLG_-a_c.woff2",
  "/assets/cormorant-garamond-cyrillic-ext-400-italic-BEGvmv_3.woff2",
  "/assets/cormorant-garamond-cyrillic-ext-400-italic-C_Uk1MUY.woff",
  "/assets/cormorant-garamond-cyrillic-ext-400-normal-DLdKLAvx.woff",
  "/assets/cormorant-garamond-cyrillic-ext-400-normal-W3Dto7M0.woff2",
  "/assets/cormorant-garamond-cyrillic-ext-500-italic-ClXnudBg.woff2",
  "/assets/cormorant-garamond-cyrillic-ext-500-italic-DakTmaFY.woff",
  "/assets/cormorant-garamond-cyrillic-ext-500-normal-Yta7XZ9C.woff2",
  "/assets/cormorant-garamond-cyrillic-ext-500-normal-lsPpqi9g.woff",
  "/assets/cormorant-garamond-cyrillic-ext-600-normal-BMhMHfrj.woff2",
  "/assets/cormorant-garamond-cyrillic-ext-600-normal-CsIYWmWK.woff",
  "/assets/cormorant-garamond-cyrillic-ext-700-normal-BaW-xaxb.woff",
  "/assets/cormorant-garamond-cyrillic-ext-700-normal-Do0rx6yy.woff2",
  "/assets/cormorant-garamond-latin-400-italic-BLh7T8o8.woff",
  "/assets/cormorant-garamond-latin-400-italic-Dc_OZ8oc.woff2",
  "/assets/cormorant-garamond-latin-400-normal-B-1hWBU7.woff2",
  "/assets/cormorant-garamond-latin-400-normal-B7YtguxJ.woff",
  "/assets/cormorant-garamond-latin-500-italic-DhNIfkTX.woff",
  "/assets/cormorant-garamond-latin-500-italic-Y14P-dkT.woff2",
  "/assets/cormorant-garamond-latin-500-normal-BsRWmXhO.woff2",
  "/assets/cormorant-garamond-latin-500-normal-zIXX3Q-H.woff",
  "/assets/cormorant-garamond-latin-600-normal-2CBVLo0M.woff",
  "/assets/cormorant-garamond-latin-600-normal-Co1r35X9.woff2",
  "/assets/cormorant-garamond-latin-700-normal-DajfzrDU.woff2",
  "/assets/cormorant-garamond-latin-700-normal-O25Qpphb.woff",
  "/assets/cormorant-garamond-latin-ext-400-italic-BdEzgT7i.woff2",
  "/assets/cormorant-garamond-latin-ext-400-italic-CQvLaSWn.woff",
  "/assets/cormorant-garamond-latin-ext-400-normal-Drx2k2n9.woff2",
  "/assets/cormorant-garamond-latin-ext-400-normal-uvC0WHQr.woff",
  "/assets/cormorant-garamond-latin-ext-500-italic-CE7zdTnu.woff2",
  "/assets/cormorant-garamond-latin-ext-500-italic-CalKM9tT.woff",
  "/assets/cormorant-garamond-latin-ext-500-normal-CH1kM7og.woff2",
  "/assets/cormorant-garamond-latin-ext-500-normal-DYeaGGzO.woff",
  "/assets/cormorant-garamond-latin-ext-600-normal-DaBc-lu7.woff2",
  "/assets/cormorant-garamond-latin-ext-600-normal-Dk3-quAP.woff",
  "/assets/cormorant-garamond-latin-ext-700-normal-CNjt5vTB.woff2",
  "/assets/cormorant-garamond-latin-ext-700-normal-qRbaVVD7.woff",
  "/assets/cormorant-garamond-vietnamese-400-italic-BoXDRTEW.woff2",
  "/assets/cormorant-garamond-vietnamese-400-italic-CJpMwFnN.woff",
  "/assets/cormorant-garamond-vietnamese-400-normal-4uxlocMh.woff",
  "/assets/cormorant-garamond-vietnamese-400-normal-6K-YXo6g.woff2",
  "/assets/cormorant-garamond-vietnamese-500-italic-C-296ow0.woff",
  "/assets/cormorant-garamond-vietnamese-500-italic-D3igDnAQ.woff2",
  "/assets/cormorant-garamond-vietnamese-500-normal-BZGLGj12.woff2",
  "/assets/cormorant-garamond-vietnamese-500-normal-DqXqCC0q.woff",
  "/assets/cormorant-garamond-vietnamese-600-normal-BoXdMtcr.woff2",
  "/assets/cormorant-garamond-vietnamese-600-normal-C4HEjEaf.woff",
  "/assets/cormorant-garamond-vietnamese-700-normal--OtHbi1I.woff2",
  "/assets/cormorant-garamond-vietnamese-700-normal-GOTdnRS1.woff",
  "/assets/index-DA61Mscd.js",
  "/assets/index-Ih_q2xkv.css",
  "/assets/manrope-cyrillic-400-normal-BMzJvInZ.woff2",
  "/assets/manrope-cyrillic-400-normal-Dvx59UGC.woff",
  "/assets/manrope-cyrillic-500-normal-B1OEZity.woff2",
  "/assets/manrope-cyrillic-500-normal-CNwnNrRC.woff",
  "/assets/manrope-cyrillic-600-normal-DvRl3Mj-.woff2",
  "/assets/manrope-cyrillic-600-normal-It4mZcQk.woff",
  "/assets/manrope-cyrillic-700-normal-7JNVKxyl.woff",
  "/assets/manrope-cyrillic-700-normal-Dw_fZAg2.woff2",
  "/assets/manrope-cyrillic-800-normal-AvdZ5mAV.woff2",
  "/assets/manrope-cyrillic-800-normal-BuEMjQU-.woff",
  "/assets/manrope-greek-400-normal-CM4qok81.woff2",
  "/assets/manrope-greek-400-normal-DuX9RsAR.woff",
  "/assets/manrope-greek-500-normal-DyxYGEtJ.woff",
  "/assets/manrope-greek-500-normal-GeMIHyWm.woff2",
  "/assets/manrope-greek-600-normal-BoRV6lzK.woff2",
  "/assets/manrope-greek-600-normal-CF2i9ZRY.woff",
  "/assets/manrope-greek-700-normal-CHUG9PD8.woff2",
  "/assets/manrope-greek-700-normal-DyfsrCpP.woff",
  "/assets/manrope-greek-800-normal-Bw-67qu9.woff",
  "/assets/manrope-greek-800-normal-CDvU698_.woff2",
  "/assets/manrope-latin-400-normal-8tf8FM3T.woff",
  "/assets/manrope-latin-400-normal-PaqtzbVb.woff2",
  "/assets/manrope-latin-500-normal-BYYD-dBL.woff2",
  "/assets/manrope-latin-500-normal-DMZssgOp.woff",
  "/assets/manrope-latin-600-normal-4f0koTD-.woff2",
  "/assets/manrope-latin-600-normal-BqgrALkZ.woff",
  "/assets/manrope-latin-700-normal-BZp_XxE4.woff2",
  "/assets/manrope-latin-700-normal-DGRFkw-m.woff",
  "/assets/manrope-latin-800-normal-BfWYOv1c.woff2",
  "/assets/manrope-latin-800-normal-uHUdIJgA.woff",
  "/assets/manrope-latin-ext-400-normal-C-X6QNXX.woff",
  "/assets/manrope-latin-ext-400-normal-CMDvPJRp.woff2",
  "/assets/manrope-latin-ext-500-normal-EtoS1VaI.woff",
  "/assets/manrope-latin-ext-500-normal-dm74KBQw.woff2",
  "/assets/manrope-latin-ext-600-normal-_gBojHdJ.woff2",
  "/assets/manrope-latin-ext-600-normal-u5Pl7hTU.woff",
  "/assets/manrope-latin-ext-700-normal-DYOwVNan.woff2",
  "/assets/manrope-latin-ext-700-normal-eVCcYqtJ.woff",
  "/assets/manrope-latin-ext-800-normal-BQAQsuQc.woff",
  "/assets/manrope-latin-ext-800-normal-DdFx7KEb.woff2",
  "/assets/manrope-vietnamese-400-normal-D7E_mLGF.woff",
  "/assets/manrope-vietnamese-400-normal-DHb3EETF.woff2",
  "/assets/manrope-vietnamese-500-normal-DCXiE_xi.woff2",
  "/assets/manrope-vietnamese-500-normal-DaZ8i3XM.woff",
  "/assets/manrope-vietnamese-600-normal-C1J5PCl_.woff2",
  "/assets/manrope-vietnamese-600-normal-lA7a_7Ok.woff",
  "/assets/manrope-vietnamese-700-normal-CUqMx5-1.woff2",
  "/assets/manrope-vietnamese-700-normal-pt65Fn2Z.woff",
  "/assets/manrope-vietnamese-800-normal-ClPWri-A.woff2",
  "/assets/manrope-vietnamese-800-normal-bvg7iBCV.woff",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/icon.svg",
  "/manifest.webmanifest"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html', { ignoreVary: true }))
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
