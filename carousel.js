let currentSlide = 0;
let slideInterval;
let videoInteracted = false;

window.addEventListener('blur', () => {
	if (document.activeElement && document.activeElement.tagName === 'IFRAME') {
		videoInteracted = true;
	}
});

function moveSlide(direction) {
	videoInteracted = false;
	const slidesContainer = document.querySelector('.carousel-slides');
	const totalSlides = document.querySelectorAll('.carousel-slide').length;
	if (slidesContainer && totalSlides > 0) {
		currentSlide = (currentSlide + direction + totalSlides) % totalSlides;
		slidesContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
	}
	resetInterval();
}

function resetInterval() {
	clearInterval(slideInterval);
	slideInterval = setInterval(() => {
		if (videoInteracted || (document.activeElement && document.activeElement.tagName === 'IFRAME')) {
			return;
		}
		const slidesContainer = document.querySelector('.carousel-slides');
		const totalSlides = document.querySelectorAll('.carousel-slide').length;
		if (slidesContainer && totalSlides > 0) {
			currentSlide = (currentSlide + 1 + totalSlides) % totalSlides;
			slidesContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
		}
	}, 10000);
}

// Start the carousel auto-scroll on page load
document.addEventListener('DOMContentLoaded', resetInterval);
