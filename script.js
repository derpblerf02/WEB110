// script.js

document.addEventListener('DOMContentLoaded', function() {
    const resumeBento = document.getElementById('resume-bento');
    const bioBento = document.getElementById('bio-bento');

    if (resumeBento) {
        resumeBento.addEventListener('click', function() {
            this.classList.toggle('expanded');
        });
    }

    if (bioBento) {
        bioBento.addEventListener('click', function() {
            this.classList.toggle('expanded');
        });
    }
});