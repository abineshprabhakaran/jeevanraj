(function () {
    var myDiv = document.getElementById("world"),
        show = function () {
            myDiv.style.display = "block";
            setTimeout(hide, 8000);
        },
        hide = function () {
            myDiv.style.display = "none";
        };
    show();
})();

$(document).ready(function () {
    setTimeout(function () {
        $("#mainPage").show();
    }, 8000);
});

$(window).on("scroll", function () {
    if ($(window).scrollTop() > 50) {
        $(".header").addClass("activeHeader");
    } else {
        $(".header").removeClass("activeHeader");
    }
});
$(window).on("scroll", function () {
    if ($(window).scrollTop() > 50) {
        $(".logoContainer").addClass("logoContainerBlock");
    } else {
        $(".logoContainer").removeClass("logoContainerBlock");
    }
});
$(window).on("scroll", function () {
    if ($(window).scrollTop() > 50) {
        $(".jusEnd").addClass("jusBetween");
    } else {
        $(".jusEnd").removeClass("jusBetween");
    }
});