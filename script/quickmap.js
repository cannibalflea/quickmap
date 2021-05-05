// create map and set starting point for the map (Vancouver)
var map = L.map('maparea').setView([49.2566742, -123.1740253], 13);
L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'
}).addTo(map)

// get the url parameters
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

// get the base URL to use for future reconstruction
const baseURL = window.location.protocol + '//' + window.location.host + window.location.pathname;

// check to see if geojson parameter was provided
if(urlParams.has('gjson')) {
    // decompress the json object
    var objGeoJson = JSON.parse(JSONUncrush(decodeURIComponent(urlParams.get('gjson'))));
    console.log(objGeoJson);

    // load the geojson data onto the map
    var ftrGroup = L.geoJSON(objGeoJson, {
        style: function (feature) {
            //return {color: feature.properties.colour};
        }
    }).bindPopup(function (layer) {
        return layer.feature.properties.name;
    }).addTo(map);

    // if geometry was loaded, then fit map to bounds
    map.fitBounds(ftrGroup.getBounds().pad(0.2));
}

// add leaflet-geoman controls
map.pm.addControls({  
    position: 'topleft',  
    drawCircleMarker: false,  
}); 

// add custom control to generate and copy encoded map url
map.pm.Toolbar.createCustomControl({   
    name: 'Create URL',  
    block: 'custom', 
    className: 'leaflet-pm-icon-url',
    title: 'URL encode features',  
    onClick: function () {
        // get all the map features
        var mapLayers = map.pm.getGeomanLayers(true).toGeoJSON();
        
        // encode and compress the URL
        var encodedGJSON = JSONCrush(JSON.stringify(mapLayers));
        
        // copy the encoded url into the clipboard
        const el = document.createElement('textarea');
        el.value = baseURL + "?gjson=" + encodedGJSON;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
    }
  }); 

  map.pm.Toolbar.createCustomControl({   
    name: 'Change Basemap',  
    block: 'custom', 
    className: 'leaflet-pm-icon-basemap',
    title: 'Change basemap'
  }); 