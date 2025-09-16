const steak = document.getElementById("STEAK");
steak.onclick = function() {
    alert("For the shareholders who needed a steak in the company");
}
dx = ((Math.random()-0.5) + 1)*2;
dy = ((Math.random()-0.5) + 1)*2;
setInterval(() => {
    // ignore if steak is hidden
    if (window.getComputedStyle(steak).display === "none") return;

    steak.style.bottom = parseInt(window.getComputedStyle(steak).bottom) + dy + "px";
    steak.style.left = parseInt(window.getComputedStyle(steak).left) + dx + "px";
    if (parseInt(window.getComputedStyle(steak).bottom) <= 0 || parseInt(window.getComputedStyle(steak).bottom) >= window.innerHeight - steak.height) {
        dy = -dy;
        // flip the image vertically and account for existing horizontal flip
        if (steak.style.transform === "scaleX(-1) scaleY(-1)") {
            steak.style.transform = "scaleX(-1) scaleY(1)";
        } else if (steak.style.transform === "scaleX(1) scaleY(-1)") {
            steak.style.transform = "scaleX(1) scaleY(1)";
        } else if (steak.style.transform === "scaleX(-1) scaleY(1)") {
            steak.style.transform = "scaleX(-1) scaleY(-1)";
        } else {
            steak.style.transform = "scaleX(1) scaleY(-1)";
        }
        dy += (Math.random() - 0.5) * 0.5;
        dy = Math.max(Math.min(dy, 5), -5);
    }
    if (parseInt(window.getComputedStyle(steak).left) <= 0 || parseInt(window.getComputedStyle(steak).left) >= window.innerWidth - steak.width) {
        dx = -dx;
        // flip the image horizontally and account for existing vertical flip
        if (steak.style.transform === "scaleX(-1) scaleY(-1)") {
            steak.style.transform = "scaleX(1) scaleY(-1)";
        } else if (steak.style.transform === "scaleX(1) scaleY(-1)") {
            steak.style.transform = "scaleX(-1) scaleY(-1)";
        } else if (steak.style.transform === "scaleX(-1) scaleY(1)") {
            steak.style.transform = "scaleX(1) scaleY(1)";
        } else {
            steak.style.transform = "scaleX(-1) scaleY(1)";
        }
        // adjust dx and dy slightly randomly to avoid boring straight lines
        dx += (Math.random() - 0.5) * 0.5;
        // limit speed to a maximum of 5 pixels per interval
        dx = Math.max(Math.min(dx, 5), -5);
}
}, 1);

// toggle steak visibility based on checkbox
const steakToggle = document.getElementById("steak-toggle");
steakToggle.onchange = function() {
    if (steakToggle.checked) {
        steak.style.display = "block";
    } else {
        steak.style.display = "none";
    }
}
// initialize based on checkbox state
if (steakToggle.checked) {
    steak.style.display = "block";
} else {
    steak.style.display = "none";
}