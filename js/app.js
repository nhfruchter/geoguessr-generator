Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

$(document).ready(function(){
	//////// global endpoints and settings /////////
	var rounds = new Object();
	var currentRound = 1;
	$.urlShortener.settings.apiKey = "AIzaSyCpDNQx97YSUFuFllgacwewK8KwL6bhZJY";
	var geocoder;
	var map;
	var sv = new google.maps.StreetViewService();

	
	//////// initialize the map /////////
	var initMap = function() {
		var loc = new google.maps.LatLng(40.443322, -79.943583);
		var mapOptions = { zoom: 7, center: loc, mapTypeId: google.maps.MapTypeId.ROADMAP };
		map = new google.maps.Map(document.getElementById('map-container'), mapOptions);
		new google.maps.StreetViewCoverageLayer().setMap(map); // overlay street view coverage
		
		google.maps.event.addListener(map.getStreetView(), 'visible_changed', function() {
			svObject = map.getStreetView();
				if ( svObject.getVisible() == true ) { 
					$("button.go-to").fadeIn();
				} else {
					$("button.go-to").fadeOut();
				}	
		});
	};
	
	google.maps.event.addDomListener(window, 'load', initMap);
	
	//////// helpers /////////
	var displayError = function(message) {
		errorVisible = $(".error-box").length > 0;
		if ( !errorVisible ) { 
			$("#form-container").append("<div class=\"error-box\"></div>");
		}
		$(".error-box").fadeIn().html(message);
		$(".error-box").delay(2000).fadeOut();
	};
	
	//////// event handlers: textbox focus /////////
	$(".step input").focus(function(){
		var address = $(this).val();
		var round = $(this).id;
		
		if ( address != "" ) {
			// switch map to location (geocoded) in box
			new google.maps.Geocoder().geocode( {'address': address}, function(results, status) {
				if ( status == google.maps.GeocoderStatus.OK ) {
					var center = results[0].geometry.location;
					console.log(results);
					map.setCenter(center);
					var marker = new google.maps.Marker( {map: map, position: center} );
				} else { 
					displayError('The location you entered was not valid. [' + status + ']');
				}
			}); 
		}
	}); 

	//////// event handlers: goto button /////////
	$("button.go-to").click(function() {
		thisround = $(this).attr('class')[0];
		addressBox = $("input#" + thisround)
		address = addressBox.val();
		
		new google.maps.Geocoder().geocode( {'address': address}, function(results, status) {
			if ( status == google.maps.GeocoderStatus.OK ) {
				var searchResult = results[0].geometry.location;
				
				sv.getPanoramaByLocation(searchResult, 250, function(data, svStatus) {
					if ( svStatus == google.maps.StreetViewStatus.OK ) {
						// we're good, street view exists here
						svSnapLocation = data.location.latLng;
						
						// if street view is open, move the streetview there
						if ( map.getStreetView().getVisible() ) {
							map.getStreetView().setPosition(svSnapLocation);
						}
										
					} else {
						displayError('Oops! No street view at this location. Please try somewhere else.');
						addressBox.val("");
					}
				});
			} else if ( status != google.maps.GeocoderStatus.OK && address != "" ) {
				displayError('The location you entered was not valid. [' + status + ']');
			}
		});
		
	});
	
	//////// event handlers: set button /////////
	$("button.set").click(function(){
		thisround = $(this).attr('class')[0];
		addressBox = $("input#" + thisround)
		address = addressBox.val();
		svObj = map.getStreetView()
		
		if ( svObj.getVisible() == true ) {
			// if you're in a streetview and hit set, grab the location from there
			streetLat = svObj.position.lat()
			streetLng = svObj.position.lng()
			rounds[thisround-1] = [thisround, streetLat, streetLng];
			addressBox.val(streetLat + ", " + streetLng);
			
			// and add it; no validation or coding needed since SV active
			var marker = new google.maps.Marker( {map: map, position: map.getStreetView().position } );
			map.setCenter( map.getStreetView());

		} else {
			// geocode address, check if SV available, add
			new google.maps.Geocoder().geocode( {'address': address}, function(results, status) {
				if ( status == google.maps.GeocoderStatus.OK ) {
					var searchResult = results[0].geometry.location;

					sv.getPanoramaByLocation(searchResult, 250, function(data, svStatus) {
						if ( svStatus == google.maps.StreetViewStatus.OK ) {
							// we're good, street view exists here
							svSnapLocation = data.location.latLng;

							// show it on the map and add it to the round queue
							map.setCenter(svSnapLocation);
							var marker = new google.maps.Marker( {map: map, position: searchResult} );

							// add to rounds queue
							rounds[thisround-1] = [thisround, svSnapLocation.lat(), svSnapLocation.lng()];				
						} else {
							displayError('Oops! No street view at this location. Please try somewhere else.');
							addressBox.val("");
						}
					});

				} else if ( status != google.maps.GeocoderStatus.OK && address != "" ) {
					displayError('The location you entered was not valid. [' + status + ']');
				}
			}); // end geocode function			
		}
	});

	//////// event handlers: generate link /////////
	$("#generate").click(function(){
		if ( Object.size(rounds) != 5 ) {
			displayError("Please complete the form before generating a link.");

		} else {
			var challenge = {
				"isSyncChallenge": true,
				"version": 1,
				"maxTimePerRound": $("#time-limit").val(),
				"rounds": [ ["round", "lat", "lng"],
				 			rounds[0], rounds[1], 
							rounds[2], rounds[3], 
							rounds[4] ]
			};
			url = "http://www.geoguessr.com/?s=" + $.base64.encode(JSON.stringify(challenge));
			shorturl = $.urlShortener({longUrl:url});
			prompt("Your custom geoguessr challenge is at: ", shorturl);
		}	
	}); // end generate function

});