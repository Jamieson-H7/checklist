(function () {
    // Detect "/<repo>/" for GitHub Pages project sites, else "/"
    const parts = location.pathname.split('/').filter(Boolean);
    const repo = parts.length ? parts[0] : '';
    const basePath = repo ? `/${repo}/` : '/';

    // Frames live under "<basePath>favicon-frames/"
    const framesDir = `${basePath}favicon-frames/`;

    // If your files are ezgif-frame-1.png ... ezgif-frame-16.png (no zero padding)
    const frameCount = 16;
    const frames = Array.from({ length: frameCount }, (_, i) =>
        `${framesDir}ezgif-frame-${String(i + 1).padStart(3, "0")}.png`
    );


    const fps = 30;
    const interval = 1000 / fps;

    // Ensure a favicon <link> exists
    let link = document.querySelector("#favicon") || document.querySelector("link[rel*='icon']");
    if (!link) {
        link = document.createElement("link");
        link.id = "favicon";
        link.rel = "icon";
        link.type = "image/png";
        document.head.appendChild(link);
    }

    // Preload to reduce flicker
    frames.forEach(src => { const img = new Image(); img.src = src; });

    let i = 0;
    function tick() {
        // Add a cache-buster in case GitHub Pages caches aggressively
        link.href = `${frames[i]}?v=${i}`;
        i = (i + 1) % frames.length;
    }

    tick();
    setInterval(tick, interval);
})();