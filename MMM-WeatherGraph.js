Module.register("MMM-WeatherGraph", {

  defaults: {
    apiKey: "",
    apiBase: "http://api.openweathermap.org/data/2.5/onecall?",
    units: config.units,
    language: config.language,
    time24hr: false,
    updateInterval: 15 * 60 * 1000, // every 15 minutes
    animationSpeed: 1000,
    initialLoadDelay: 0, // 0 seconds delay
    retryDelay: 2500,
    tempDecimalPlaces: 0, // round temperatures to this many decimal places
    geoLocationOptions: {
      enableHighAccuracy: true,
      timeout: 5000
    },
    latitude:  null,
    longitude: null,
    showSummary: true,
    showForecast: true,
    showForecastPrecip: true,
    showGraph: true,
    graphHourRange: 48,
    showGraphTemp: true,
    graphTempColor: 'white',
    showGraphWind: true,
    graphWindColor: 'grey',
    showGraphHumid: false,
    graphHumidColor: '#88CC88',
    showGraphCloud: false,
    graphCloudColor: '#dedb49',
    showGraphLegend: true,
    precipitationGraphWidth: 400,
    precipitationGraphHeight: 0,
    showHotColdLines: true,
    showWind: true,
    showSunrise: true,
    unitTable: {
      'default':  'imperial',
      'metric':   'metric',
      'imperial': 'imperial'
    },

// https://openweathermap.org/weather-conditions#Weather-Condition-Codes-2
    iconTable: {
      'Clear':               'wi-day-sunny',
      'clear night':         'wi-night-clear',
      'few clouds':   	     'wi-day-cloudy',
      'Clouds': 	     'wi-cloudy',
      'broken clouds':       'wi-day-cloudy',
      'Drizzle':             'wi-rain',
      'Rain':                'wi-rain',
      'Thunderstorm':        'wi-thunderstorm',
      'Snow':                'wi-snow',
      'Mist':                'wi-fog',
      'Haze':                'wi-fog',
      'Fog':                 'wi-fog',
      'Tornado':             'wi-tornado'
    },

    debug: true
  },

  getTranslations: function () {
    return false;
  },

  getScripts: function () {
    return [
      'jsonp.js',
      'moment.js'
    ];
  },

  getStyles: function () {
    return ["weather-icons.css", "MMM-WeatherGraph.css"];
  },

  shouldLookupGeolocation: function () {
    return this.config.latitude == null &&
           this.config.longitude == null;
  },

  start: function () {
    Log.info("Starting module: " + this.name);

    if (this.shouldLookupGeolocation()) {
      this.getLocation();
    }
    this.scheduleUpdate(this.config.initialLoadDelay);
  },

  updateWeather: function () {
    if (this.geoLocationLookupFailed) {
      return;
    }
    if (this.shouldLookupGeolocation() && !this.geoLocationLookupSuccess) {
      this.scheduleUpdate(1000); // try again in one second
      return;
    }

    var units = this.config.unitTable[this.config.units] || 'auto';

    var url = this.config.apiBase+'appid='+this.config.apiKey+'&lat='+this.config.latitude+'&lon='+this.config.longitude+'&units='+units+'&lang='+this.config.language;

    if (this.config.debug) {
      console.log('Query URL: ', url);
    }

    if (this.config.data) {
      // for debugging
      this.processWeather(this.config.data);
    } else {
      getJSONP(url, this.processWeather.bind(this), this.processWeatherError.bind(this));
    }
  },

  processWeather: function (data) {
    if (this.config.debug) {
      console.log('weather data', data);
    }
    this.loaded = true;
    this.weatherData = data;
    this.temp = this.roundTemp(this.weatherData.current.temp);
    this.updateDom(this.config.animationSpeed);
    this.scheduleUpdate();
  },

  processWeatherError: function (error) {
    if (this.config.debug) {
      console.log('process weather error', error);
    }
    // try later
    this.scheduleUpdate();
  },

  notificationReceived: function(notification, payload, sender) {
    switch(notification) {
      case "DOM_OBJECTS_CREATED":
        break;
    }
  },

  getDom: function() {
    var wrapper = document.createElement("div");

    if (this.config.apiKey === "") {
      wrapper.innerHTML = "Please set the correct OpenWeatherMarp.org <i>apiKey</i> in the config for module: " + this.name;
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    if (this.geoLocationLookupFailed) {
      wrapper.innerHTML = "Geolocaiton lookup failed, please set <i>latitude</i> and <i>longitude</i> in the config for module: " + this.name;
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    if (!this.loaded) {
      wrapper.innerHTML = this.translate('Loading Weather...');
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    var currentWeather = this.weatherData.current;
    var hourly         = this.weatherData.hourly;
    var minutely       = this.weatherData.minutely;
    var daily          = this.weatherData.daily;

    var timeFormat = "h:mm a";
    if (this.config.time24hr) {
      timeFormat = "HH:mm";
    } else {
      timeFormat = "h:mm a";
    }

//========== Current large icon & Temp
    var large = document.createElement("div");
    large.className = "large light";

    var iconClass = this.config.iconTable[this.weatherData.current.weather[0].main];

    var icon = document.createElement("span");
    icon.className = 'big-icon wi ' + iconClass;
    large.appendChild(icon);

    var temperature = document.createElement("span");
    temperature.className = "bright";
    temperature.innerHTML = " " + this.temp + "&deg;";
    large.appendChild(temperature);

// ====== wind now
    if (this.config.showWind) {
      var padding = document.createElement("span");
      padding.className = "dim";
      padding.innerHTML = " &nbsp &nbsp ";
      large.appendChild(padding);

      var windicon = document.createElement("span");
      windicon.className = 'big-icon wi wi-strong-wind xdimmed';
      large.appendChild(windicon);

      var wind = document.createElement("span");
      wind.className = "dim";
      wind.innerHTML = " " + Math.round(this.weatherData.current.wind_speed) + " ";
      large.appendChild(wind);
    }

//========== sunrise/sunset
    if (this.config.showSunrise) {
      var midText = document.createElement("div");
      midText.className = "light";

      var today    = this.weatherData.daily[0];
      var tomorrow = this.weatherData.daily[1];
      var now      = new Date();

      if (today.sunrise*1000 < now && today.sunset*1000 > now) {
      	var sunset = new moment.unix(today.sunset).format( timeFormat );
        sunString1 = '<span class="wi wi-sunset xdimmed"></span> '  + sunset;

    	var sunrise = new moment.unix(tomorrow.sunrise).format( timeFormat );
        sunString2 = '<span class="wi wi-sunrise xdimmed"></span> ' + sunrise;
      } else {
    	var sunrise = new moment.unix(today.sunrise).format( timeFormat );
        sunString1 = '<span class="wi wi-sunrise xdimmed"></span> ' + sunrise;

      	var sunset = new moment.unix(tomorrow.sunset).format( timeFormat );
        sunString2 = '<span class="wi wi-sunset xdimmed"></span> '  + sunset;
      }

      var sunTime = document.createElement("div");
      sunTime.className = "small dimmed summary";
      sunTime.innerHTML = sunString1 + "  " + sunString2;
      large.appendChild(sunTime);
    }
    wrapper.appendChild(large);

// =========  summary text
    if (this.config.showSummary) {
      var summary = document.createElement("div");
      var summarySnow = "";
      var summaryRain = "";
      var summaryText = "";
      var precipAmt = 0;

      if (this.config.showForecastPrecip) {
        if (this.config.units == 'metric') {       // Metric (mm/cm)
          if (this.weatherData.daily[0].rain ) {
            precipAmt = this.weatherData.daily[0].rain;
            summaryRain = ', ' + precipAmt.toFixed(1) + 'mm rain';
          }
          if (this.weatherData.daily[0].snow ) {
            precipAmt = this.weatherData.daily[0].snow / 10;
            summarySnow = ', ' + precipAmt.toFixed(1) + 'cm snow';
          }
        } else {                                // Imperial (inches)
          if (this.weatherData.daily[0].rain ) {
            precipAmt = this.weatherData.daily[0].rain / 25.4;
            summaryRain = ', ' + precipAmt.toFixed(1) + '" rain';
          }
          if (this.weatherData.daily[0].snow ) {
            precipAmt = this.weatherData.daily[0].snow / 25.4;
            summarySnow = ', ' + precipAmt.toFixed(1) + '" snow';
          }
        }
      }

      summaryText = this.weatherData.current.weather[0].description + summaryRain + summarySnow;

      summary.className = "small dimmed summary";
      summary.innerHTML = summaryText;
      wrapper.appendChild(summary);
    }

// ======== precip graph and forecast table
    if (this.config.showGraph) {
      wrapper.appendChild(this.renderPrecipitationGraph());
    }
    if (this.config.showForecast) {
      wrapper.appendChild(this.renderWeatherForecast());
    }

    return wrapper;
  },

  renderPrecipitationGraph: function () {
    var i;
    var width = this.config.precipitationGraphWidth; 

    if (this.config.precipitationGraphHeight) {
      if (this.config.precipitationGraphHeight < 30) {
        var height = 30;
      } else {
        var height = this.config.precipitationGraphHeight;
      }
    } else {
      var height = Math.round(width * 0.3);       // 30% by default
    }


    var element = document.createElement('canvas');
    var graphHours = this.config.graphHourRange;

    element.className = "precipitation-graph";
    element.width  = width;
    element.height = height;
    var context = element.getContext('2d');
    var stepSize = (width / graphHours);  // horizontal pixels per hour

// ======= shade blocks for daylight hours  (grey=day, black=night)
    var now = new Date();
    now = Math.floor(now / 1000);    // current time in Unix format
    var timeUnilSunrise;
    var timeUnilSunset;
    var sunrisePixels;    // daytime shade box location on graph
    var sunsetPixels;

    if (graphHours < 6) {
      graphHours = 6;
    }
    if (graphHours > 48) {
      graphHours = 48;
    }

    context.save();
    for (i = 0; i < 3; i++) {                // 3 days ([0]..[2])
      timeUnilSunrise = (this.weatherData.daily[i].sunrise - now);
      timeUnilSunset  = (this.weatherData.daily[i].sunset - now);

      if ((timeUnilSunrise < 0) && (i == 0)) {     
        timeUnilSunrise = 0;       // sunrise has happened already today
      }
      if ((timeUnilSunset < 0) && (i == 0)) {     
        timeUnilSunset = 0;        // sunset has happened already today
      }

      sunrisePixels = (timeUnilSunrise/60/60)*stepSize;
      sunsetPixels  = (timeUnilSunset/60/60)*stepSize;

      context.fillStyle = "#323232";
      context.fillRect(sunrisePixels, 0, (sunsetPixels-sunrisePixels), height);
    }
    context.restore();

// ====== scale graph for units
    if (this.config.units == 'metric') {
      var precipGraphYMin = -15;  // graph -15 to 45 degrees C
      var precipGraphYMax = 45;
    } else {
      var precipGraphYMin = -10;  // graph -10 to 110 degrees F
      var precipGraphYMax = 110;
    }
    var precipGraphYRange = precipGraphYMax-precipGraphYMin;  // degree range
    var precipGraphPixelsPerDegree = height/precipGraphYRange;

// ====== freezing and hot lines
    if (this.config.showHotColdLines) {
      if (this.config.units == 'metric') {
        i = 27;    // Hot line at 27 c
      } else {
        i = 80;    // Hot line at 80 f
      }
      context.save();
      context.beginPath();
      context.setLineDash([5, 10]);
      context.lineWidth = 1;
      context.strokeStyle = 'red';
      context.moveTo(0, height - (i-precipGraphYMin)*precipGraphPixelsPerDegree );
      context.lineTo(width, height - (i-precipGraphYMin)*precipGraphPixelsPerDegree );
      context.stroke();
 
      if (this.config.units == 'metric') {
        i = 0;    // Freezing line at 0 c
      } else {
        i = 32;   // Freezing line at 32 f
      }
      context.beginPath();
      context.strokeStyle = 'blue';
      context.moveTo(0, height - (i-precipGraphYMin)*precipGraphPixelsPerDegree );
      context.lineTo(width, height - (i-precipGraphYMin)*precipGraphPixelsPerDegree );
      context.stroke();
      context.restore();
    }

// ====== graph of rain / snow
    if (this.config.showGraphPrecip) {
      var data = this.weatherData.hourly;   // mm of liquid water per hour

      context.save();
      context.beginPath();
      context.moveTo(0, height);
      var intensity;
      for (i = 0; i < data.length; i++) {
        intensity = 0;
        var RainScale = 0.2;   // OpenWeatherMap scale - mm per hour

        if (this.weatherData.hourly[i].rain ) {
          if (this.weatherData.hourly[i].rain["1h"] ) {
            intensity = (this.weatherData.hourly[i].rain["1h"] * height * RainScale) + 4;   // make trace stand out
          }
        }
        context.lineTo(i * stepSize, height - intensity);
      }
      context.lineTo(width, height);
      context.closePath();

      context.strokeStyle = 'blue';
      context.stroke();

      context.fillStyle = 'blue';
      context.fill();
      context.restore();

// ====== graph of snow 
      context.save();

      context.beginPath();
      context.moveTo(0, height);
      var intensity;
      for (i = 0; i < data.length; i++) {
        intensity = 0;
        if (this.weatherData.hourly[i].snow ) {
          if (this.weatherData.hourly[i].snow["1h"] ) {
            intensity = (this.weatherData.hourly[i].snow["1h"] * height * RainScale) + 4;   // make trace stand out
          }
        }
        context.lineTo(i * stepSize, height - intensity);
      }
      context.lineTo(width, height);
      context.closePath();

      context.strokeStyle = 'white';
      context.stroke();

      context.fillStyle = 'white';
      context.fill();
      context.restore();
    }

// ===== 6hr tick lines
    var tickCount = Math.round(width / (stepSize*6));
    context.save();
    context.beginPath();
    context.strokeStyle = 'grey';
    context.fillStyle = 'grey';
    context.lineWidth = 2;
    for (i = 1; i < tickCount; i++) {             
      context.moveTo(i * (stepSize*6), height);
      context.lineTo(i * (stepSize*6), height - 7);
      context.stroke();
    }
    context.restore();

// ========= graph of temp
    if (this.config.showGraphTemp) {
      var numMins = 60 * graphHours;     // minutes in graph
      var tempTemp;

      context.save();
      context.strokeStyle = this.config.graphTempColor;
      context.fillStyle = this.config.graphTempColor;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, height);

      var stepSizeTemp = Math.round(width / (graphHours-1));
      var tempX;
      var tempY;

      for (i = 0; i < graphHours; i++) {
        tempX = i * stepSizeTemp;
        tempY = height - (this.weatherData.hourly[i].temp-precipGraphYMin)*precipGraphPixelsPerDegree;

        context.lineTo( tempX, tempY );   // line from last hour to this hour
        context.stroke();

        context.beginPath();
        context.arc(tempX, tempY, 1 ,0,2*Math.PI);          // hour-dots
        context.stroke();
      }
      context.restore();

      var timeLabel;
      for (i = 0; i < graphHours; i++) {     // text label for temperature on graph
        if ((i % 2) == 1) {
          tempX = (i * stepSizeTemp) - 5;
          tempY = height - (this.weatherData.hourly[i].temp-precipGraphYMin)*precipGraphPixelsPerDegree-5;
          tempTemp = Math.round( this.weatherData.hourly[i].temp );

          context.beginPath();
          context.font = "10px Arial";
          context.fillStyle = this.config.graphTempColor;
          context.fillText( tempTemp, tempX, tempY );
          context.stroke();
        }
      }
    }

// ========= graph of wind
    if (this.config.showGraphWind) {
      var numMins = 60 * graphHours;     // minutes in graph
      var tempWind;

      context.save();
      context.strokeStyle = this.config.graphWindColor;
      context.lineWidth = 1;

      context.beginPath();
      context.moveTo(0, height);

      var stepSizeTemp = Math.round(width / (graphHours-1));
      var tempX;
      var tempY;

      if (this.config.units == 'metric') {
        var windGraphScale = height/18;   // vertical scale of wind speed (upto 18 meter/sec)
      } else {
        var windGraphScale = height/40;   // vertical scale of wind speed (upto 40 mph)
      }

      for (i = 0; i < (graphHours); i++) {    // wind line graph
        tempX = i * stepSizeTemp;
        tempY = height - ((this.weatherData.hourly[i].wind_speed * windGraphScale) + 5);

        context.lineTo( tempX, tempY );       // line from last hour to this hour
        context.stroke();

        context.beginPath();
        context.arc(tempX, tempY, 1 ,0,2*Math.PI);          // hour-dots
        context.stroke();
      }
      context.restore();

      context.save();
      for (i = 0; i < (graphHours); i++) {     // text label for wind on graph
        if ((i % 2) == 1) {
          tempX = (i * stepSizeTemp) - 5;
          tempY = height - ((this.weatherData.hourly[i].wind_speed * windGraphScale) + 5 + 3);
          tempWind = Math.round( this.weatherData.hourly[i].wind_speed );

          context.beginPath();
          context.font = "10px Arial";
          context.fillStyle = this.config.graphWindColor;
          context.fillText( tempWind, tempX, tempY );
          context.stroke();
        }
      }
      context.restore();
    }

// ========= graph of Humidity
    if (this.config.showGraphHumid) {
      var numMins = 60 * graphHours;     // minutes in graph
      var tempHumid;

      context.save();
      context.strokeStyle = this.config.graphHumidColor;
      context.lineWidth = 1;

      context.beginPath();
      context.moveTo(0, height);

      var stepSizeTemp = Math.round(width / (graphHours-1));
      var tempX;
      var tempY;

      var humidGraphScale = height/110;

      for (i = 0; i < (graphHours); i++) {    // line graph
        tempX = i * stepSizeTemp;
        tempY = height - ((this.weatherData.hourly[i].humidity * humidGraphScale) + 5);

        context.lineTo( tempX, tempY );       // line from last hour to this hour
        context.stroke();

        context.beginPath();
        context.arc(tempX, tempY, 1 ,0,2*Math.PI);          // hour-dots
        context.stroke();
      }
      context.restore();

      context.save();
      for (i = 0; i < (graphHours); i++) {     // text label 
        if ((i % 2) == 1) {
          tempX = (i * stepSizeTemp) - 5;
          tempY = height - ((this.weatherData.hourly[i].humidity * humidGraphScale) + 5 + 3);
          tempHumid = Math.round( this.weatherData.hourly[i].humidity );

          context.beginPath();
          context.font = "10px Arial";
          context.fillStyle = this.config.graphHumidColor;
          context.fillText( tempHumid, tempX, tempY );
          context.stroke();
        }
      }
      context.restore();
    }

// ========= graph of Cloud Cover
    if (this.config.showGraphCloud) {
      var numMins = 60 * graphHours;     // minutes in graph
      var tempHumid;

      context.save();
      context.strokeStyle = this.config.graphCloudColor;
      context.lineWidth = 1;

      context.beginPath();
      context.moveTo(0, height);

      var stepSizeTemp = Math.round(width / (graphHours-1));
      var tempX;
      var tempY;

      var cloudGraphScale = height/110;

      for (i = 0; i < (graphHours); i++) {    // line graph
        tempX = i * stepSizeTemp;
        tempY = height - ((this.weatherData.hourly[i].clouds * cloudGraphScale) + 5);

        context.lineTo( tempX, tempY );       // line from last hour to this hour
        context.stroke();

        context.beginPath();
        context.arc(tempX, tempY, 1 ,0,2*Math.PI);          // hour-dots
        context.stroke();
      }
      context.restore();

      context.save();
      for (i = 0; i < (graphHours); i++) {     // text label 
        if ((i % 2) == 1) {
          tempX = (i * stepSizeTemp) - 5;
          tempY = height - ((this.weatherData.hourly[i].clouds * cloudGraphScale) + 5 + 3);
          tempCloud = Math.round( this.weatherData.hourly[i].clouds );

          context.beginPath();
          context.font = "10px Arial";
          context.fillStyle = this.config.graphCloudColor;
          context.fillText( tempCloud, tempX, tempY );
          context.stroke();
        }
      }
      context.restore();
    }


// ====== line legends 
    if (this.config.showGraphLegend) {
      context.beginPath();
      context.font = "10px Arial";
      var labelHeight = 5;
      if (this.config.showGraphCloud) {
        context.fillStyle = this.config.graphCloudColor;
        context.fillText( "Cloud%", width-30, height-labelHeight );
        labelHeight = labelHeight+10;
      }
      if (this.config.showGraphHumid) {
        context.fillStyle = this.config.graphHumidColor;
        context.fillText( "Humid%", width-30, height-labelHeight );
        labelHeight = labelHeight+10;
      }
      if (this.config.showGraphWind) {
        context.fillStyle = this.config.graphWindColor;
        context.fillText( "Wind", width-30, height-labelHeight );
        labelHeight = labelHeight+10;
      }
      if (this.config.showGraphTemp) {
        context.fillStyle = this.config.graphTempColor;
        context.fillText( "Temp", width-30, height-labelHeight );
        labelHeight = labelHeight+10;
      }
      context.stroke();
    }


// hour labels
//        timeLabel = this.weatherData.hourly.data[i].time;
//        timeLabel = moment(timeLabel*1000).format("ha");
//        timeLabel = timeLabel.replace("m", " ");
//        context.beginPath();
//        context.font = "10px Arial";
//        context.fillStyle = "grey";
//        context.fillText( timeLabel , tempX, 10 );
//        context.stroke();

    return element;
  },

  getDayFromTime: function (time) {
    var dt = new Date(time * 1000);
    return moment.weekdaysShort(dt.getDay());
  },

  renderForecastRow: function (data, min, max) {
    var total = max - min;
    var interval = 100 / total;
    var rowMinTemp = this.roundTemp(data.temp.min);
    var rowMaxTemp = this.roundTemp(data.temp.max);

    var row = document.createElement("tr");
    row.className = "forecast-row";

    var dayTextSpan = document.createElement("span");
    dayTextSpan.className = "forecast-day"
    dayTextSpan.innerHTML = this.getDayFromTime(data.dt);

    var iconClass = this.config.iconTable[data.weather[0].main];
    var icon = document.createElement("span");
    icon.className = 'wi weathericon ' + iconClass;

    var forecastBar = document.createElement("div");
    forecastBar.className = "forecast-bar";

    var minTemp = document.createElement("span");
    minTemp.innerHTML = rowMinTemp + "&deg;";
    minTemp.className = "temp min-temp";

    var maxTemp = document.createElement("span");
    maxTemp.innerHTML = rowMaxTemp + "&deg;";
    maxTemp.className = "temp max-temp";

    var bar = document.createElement("span");
    bar.className = "bar";
    bar.innerHTML = "&nbsp;"
    var barWidth = Math.round(interval * (rowMaxTemp - rowMinTemp));
    bar.style.width = barWidth + '%';

    var leftSpacer = document.createElement("span");
    leftSpacer.style.width = (interval * (rowMinTemp - min)) + "%";
    var rightSpacer = document.createElement("span");
    rightSpacer.style.width = (interval * (max - rowMaxTemp)) + "%";



    var dayPrecip = document.createElement("span");
    dayPrecip.className = "forecast-day";
    var precipAmt = 0;

    if (this.config.showForecastPrecip) {
      if (this.config.units == 'metric') {       // Metric (mm/cm)
        if (data.snow) {
          precipAmt = data.snow / 10;
          dayPrecip.innerHTML = precipAmt.toFixed(1) + 'cm';
        } else {
          if (data.rain) {
            precipAmt = data.rain;
            dayPrecip.innerHTML = precipAmt.toFixed(1) + 'mm';
          } else {
            dayPrecip.innerHTML = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
          }
        }
      } else {                                 // Imperial (inches)
        if (data.snow) {
          precipAmt = data.snow / 25.4;
          dayPrecip.innerHTML = precipAmt.toFixed(1) + '"';
        } else {
          if (data.rain) {
            precipAmt = data.rain / 25.4;
            dayPrecip.innerHTML = precipAmt.toFixed(1) + '"';
          } else {
            dayPrecip.innerHTML = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
          }
        }
      }
    }
    forecastBar.appendChild( dayPrecip );

    forecastBar.appendChild(leftSpacer);
    forecastBar.appendChild(minTemp);
    forecastBar.appendChild(bar);
    forecastBar.appendChild(maxTemp);
    forecastBar.appendChild(rightSpacer);

    var forecastBarWrapper = document.createElement("td");
    forecastBarWrapper.appendChild(forecastBar);

    row.appendChild(dayTextSpan);
    row.appendChild(icon);
    row.appendChild(forecastBarWrapper);

    return row;
  },

  renderWeatherForecast: function () {
    var numDays =  7;
    var i;

    var filteredDays =
      this.weatherData.daily.filter( function(d, i) { return (i < numDays); });

    var min = Number.MAX_VALUE;
    var max = -Number.MAX_VALUE;
    for (i = 0; i < filteredDays.length; i++) {
      var day = filteredDays[i];
      min = Math.min(min, day.temp.min);
      max = Math.max(max, day.temp.max);
    }
    min = Math.round(min);
    max = Math.round(max);        // this week's min & max, for graph scaling

    var display = document.createElement("table");
    display.className = "forecast";
    for (i = 0; i < filteredDays.length; i++) {
      var day = filteredDays[i];
      var row = this.renderForecastRow(day, min, max);
      display.appendChild(row);
    }
    return display;
  },

  getLocation: function () {
    var self = this;
    navigator.geolocation.getCurrentPosition(
      function (location) {
        if (self.config.debug) {
          console.log("geolocation success", location);
        }
        self.config.latitude  = location.coords.latitude;
        self.config.longitude = location.coords.longitude;
        self.geoLocationLookupSuccess = true;
      },
      function (error) {
        if (self.config.debug) {
          console.log("geolocation error", error);
        }
        self.geoLocationLookupFailed = true;
        self.updateDom(self.config.animationSpeed);
      },
      this.config.geoLocationOptions);
  },

// Round the temperature based on tempDecimalPlaces
  roundTemp: function (temp) {
    var scalar = 1 << this.config.tempDecimalPlaces;

    temp *= scalar;
    temp  = Math.round( temp );
    temp /= scalar;

    return temp;
  },

  scheduleUpdate: function(delay) {
    var nextLoad = this.config.updateInterval;
    if (typeof delay !== "undefined" && delay >= 0) {
      nextLoad = delay;
    }

    var self = this;
    setTimeout(function() {
      self.updateWeather();
    }, nextLoad);
  }

});
