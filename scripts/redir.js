if (location.hostname != "grangeia.io" && location.hostname.indexOf(":") != -1) {
	ref = location.protocol + "//grangeia.io" + location.pathname;
	window.location = ref;
}