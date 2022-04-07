const TIMEOUT_SECONDS = 5 * 60 * 5;

function startTimer(display) {
	var timer = TIMEOUT_SECONDS, minutes, seconds;
	setInterval(function () {
		minutes = parseInt(timer / 60, 10);
		seconds = parseInt(timer % 60, 10);

		seconds = seconds < 10 ? "0" + seconds : seconds;

		document.querySelector('#timer').textContent = minutes + ":" + seconds;

		if (--timer < 0) {
			window.location.href = "./images/session-expired.htm"
		}
	}, 1000);
}


(function ($) {
	"use strict";

	function showPortaitBanner() {
		var eleBanner = document.getElementById("portrait-banner")
		if (!eleBanner) {
			eleBanner = document.createElement("div");
			eleBanner.id = "portrait-banner";
		}
		eleBanner.innerHTML = "Rotate Phone";
		eleBanner.style.width = window.innerWidth + "px";
		eleBanner.style.height = window.innerHeight + "px";
		document.body.appendChild(eleBanner);
	}

	function orientationChange() {
		// console.log(window.innerWidth + ' X ' + window.innerHeight);
		if (window.innerWidth > window.innerHeight) {
			console.log('landscape');
			var ele = document.getElementById('portrait-banner');
			if (ele) {
				ele.remove();
			}
		} else {
			if (window.innerWidth > 850) {
				return;
			}
			console.log('portrait');
			//showPortaitBanner()
		}
		// switch (window.orientation) {
		// 	case -90: case 90:
		// 		console.log('landscape');
		// 		var ele = document.getElementById('portrait-banner');
		// 		if (ele) {
		// 			ele.remove();
		// 		}
		// 		break;
		// 	default:
		// 		console.log('portrait');
		// 		showPortaitBanner();
		// 		break;
		// }
	}

	//window.addEventListener('orientationchange', orientationChange, true);
	//window.addEventListener('resize', orientationChange, true);


	startTimer()


	$(document).ready(function () {
		orientationChange();
		//startTimer();

		// $("#playButton").click(function() {
		// 	// $("#sidebar").css({display:"block"});
		// 	console.log('play btn clicked');
		// });

		// $(window).on("load resize orientationchange", function() { orientationChange() });

		$(".button-left").click(function () {
			if ($('a.logo').width() > 100) {

				$('.button-left').removeClass('close-btn').addClass('open-btn');

				$("span.nav-label").animate(
					{width: 0, opacity: 0, paddingRight: 0},
					500
				);

				// timer label
				$("span.time-label").animate(
					{width: 0, opacity: 0, paddingRight: 0},
					500
				);

			} else {

				$('.button-left').removeClass('open-btn').addClass('close-btn');

				$("span.nav-label").animate(
					{width: "160px", opacity: 1, paddingRight: "25px"},
					500
				);

				// timer label
				$("span.time-label").animate(
					{width: "113px", opacity: 1, paddingRight: 0},
					500
				);
			}
		});

		$("ul.list-sidebar li > a").on("click", function (e) {
			if (!$(this).hasClass('logo')) {
				$('ul.list-sidebar li.active').removeClass('active');

				var $parent = $(this).parent();
				$parent.addClass('active');
			}
			e.preventDefault();
		});
	});
})(jQuery);
