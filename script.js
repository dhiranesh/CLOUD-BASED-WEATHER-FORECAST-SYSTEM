// --- LOGIN LOGIC (runs immediately) ---
(function() {
    const loginForm = document.getElementById('loginForm');
    const loginSection = document.getElementById('loginSection');
    const appSection = document.getElementById('appSection');
    const loginError = document.getElementById('loginError');
    const logoutButton = document.getElementById('logoutButton'); // Used to make it visible on login

    if (loginForm && loginSection && appSection && loginError) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            
            if (!usernameInput || !passwordInput) {
                console.error("Username or password input not found");
                return;
            }

            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            if (username === 'admin' && password === '123') {
                loginSection.style.display = 'none';
                document.body.classList.remove('centered');
                appSection.style.display = 'block';
                if (logoutButton) logoutButton.style.display = 'inline-block';
                loginError.style.display = 'none';
            } else {
                loginError.textContent = 'Invalid username or password!';
                loginError.style.display = 'block';
            }
        });
    } else {
        console.error("One or more login-related elements are missing.");
    }
})();

// --- ANGULAR APP ---
var app = angular.module('weatherApp', []);

app.controller('weatherCtrl', function($scope, $http) {
    const citySuggestions = document.getElementById('citySuggestions');
    const resultDiv = document.getElementById('result');
    const mapDiv = document.getElementById('map');
    const logoutButton = document.getElementById('logoutButton');
    const appSection = document.getElementById('appSection');
    
    $scope.city = '';

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    async function fetchCitySuggestions(query) {
        if (!citySuggestions) return;
        if (query.length < 2) {
            citySuggestions.innerHTML = '';
            citySuggestions.style.display = 'none';
            return;
        }
        try {
            const response = await fetch(`weather_api_test.php?query=${encodeURIComponent(query)}`);
            const suggestions = await response.json();
            citySuggestions.innerHTML = '';
            if (suggestions && suggestions.length > 0) {
                suggestions.forEach(location => {
                    const suggestionDiv = document.createElement('div');
                    suggestionDiv.classList.add('suggestion-item');
                    suggestionDiv.textContent = `${location.name}, ${location.region}, ${location.country}`;
                    suggestionDiv.addEventListener('click', () => {
                        $scope.$apply(() => {
                            $scope.city = location.name;
                        });
                        citySuggestions.innerHTML = '';
                        citySuggestions.style.display = 'none';
                    });
                    citySuggestions.appendChild(suggestionDiv);
                });
                citySuggestions.style.display = 'block';
            } else {
                citySuggestions.style.display = 'none';
            }
        } catch (error) {
            console.error("Failed to fetch city suggestions:", error);
            citySuggestions.style.display = 'none';
        }
    }

    const cityInputElement = document.getElementById('city');
    if (cityInputElement) {
        cityInputElement.addEventListener('input', debounce(event => {
            fetchCitySuggestions(event.target.value);
        }, 300));
    }

    document.addEventListener('click', function(event) {
        const cityInputElement = document.getElementById('city'); // Re-fetch in case of dynamic changes
        if (cityInputElement && !cityInputElement.contains(event.target) && citySuggestions && !citySuggestions.contains(event.target)) {
            citySuggestions.style.display = 'none';
        }
    });

    if (logoutButton && appSection) {
        logoutButton.addEventListener('click', () => {
            appSection.style.display = 'none';
            logoutButton.style.display = 'none';

            const loginSection = document.getElementById('loginSection');
            if (loginSection) {
                 loginSection.style.display = 'flex';
                 document.body.classList.add('centered');
            }

            $scope.$apply(() => {
                $scope.city = '';
            });
            if(resultDiv) resultDiv.innerHTML = '';
            if(mapDiv) mapDiv.style.display = 'none';
            if (map) { // map variable needs to be defined in this scope or passed
                map.remove();
                map = null; // Reset map state
                marker = null; // Reset marker state
            }
        });
    }

    let map, marker; // Define map and marker in the controller's scope

    function showMap(lat, lon, city) {
        if (!mapDiv) return;
        mapDiv.style.display = 'block';
        if (!map) {
            map = L.map(mapDiv).setView([lat, lon], 10); // Pass mapDiv directly
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap &mdash; Weather data by WeatherAPI.com'
            }).addTo(map);
            marker = L.marker([lat, lon]).addTo(map);
        } else {
            map.setView([lat, lon], 10);
            marker.setLatLng([lat, lon]);
        }
        marker.bindPopup(city).openPopup();
        setTimeout(() => {
            if (map) map.invalidateSize();
        }, 10);
    }

    $scope.getWeather = async function() {
        const city = $scope.city ? $scope.city.trim() : '';
        
        if(resultDiv) resultDiv.innerHTML = '';
        if(mapDiv) mapDiv.style.display = 'none';
        if(citySuggestions) citySuggestions.style.display = 'none';

        if (!city) {
            if(resultDiv) resultDiv.innerHTML = '<div class="weather-card"><p class="error">Please enter a city name.</p></div>';
            return;
        }

        if(resultDiv) resultDiv.innerHTML = '<div class="loader"></div>';

        try {
            const response = await $http({
                method: 'GET',
                url: `weather_api_test.php?city=${encodeURIComponent(city)}`
            });
            const data = response.data;

            if (data.error) {
                const errorMessage = data.error.message || (typeof data.error === 'string' ? data.error : 'An unknown error occurred.');
                if(resultDiv) resultDiv.innerHTML = `<div class="weather-card"><p class="error">Error: ${errorMessage}</p></div>`;
            } else {
                let forecastHtml = '<div class="forecast-container"><h3>3-Day Forecast</h3><div class="forecast-days">';
                if (data.forecast && data.forecast.forecastday) {
                    data.forecast.forecastday.forEach(day => {
                        forecastHtml += `
                            <div class="forecast-day-card">
                                <div class="forecast-date">${new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                                <img src="${day.day.condition.icon}" alt="${day.day.condition.text}">
                                <div class="forecast-temps">
                                    <p><strong>Max:</strong> ${day.day.maxtemp_c}°C / ${day.day.maxtemp_f}°F</p>
                                    <p><strong>Min:</strong> ${day.day.mintemp_c}°C / ${day.day.mintemp_f}°F</p>
                                </div>
                                <div class="forecast-condition">${day.day.condition.text}</div>
                            </div>
                        `;
                    });
                }
                forecastHtml += '</div></div>';

                if(resultDiv) resultDiv.innerHTML = `
                    <div class="weather-card">
                        <h2>${data.location.name}, ${data.location.country} (Current)</h2>
                        <div class="weather-details">
                            <p><strong>Temperature:</strong> ${data.current.temp_c}°C / ${data.current.temp_f}°F</p>
                            <p><strong>Condition:</strong> <img src="${data.current.condition.icon}" alt="${data.current.condition.text}" style="vertical-align: middle; width: 24px; height: 24px; margin-right: 5px;"> ${data.current.condition.text}</p>
                            <p><strong>Wind:</strong> ${data.current.wind_kph} km/h (${data.current.wind_dir})</p>
                            <p><strong>Humidity:</strong> ${data.current.humidity}%</p>
                            <p><strong>Pressure:</strong> ${data.current.pressure_mb} mb</p>
                            <p><strong>Visibility:</strong> ${data.current.vis_km} km</p>
                            <p><strong>Feels Like:</strong> ${data.current.feelslike_c}°C / ${data.current.feelslike_f}°F</p>
                            <p><strong>Last Updated:</strong> ${new Date(data.current.last_updated).toLocaleString()}</p>
                        </div>
                    </div>
                    ${forecastHtml}
                `;
                if (data.location && data.location.lat && data.location.lon) {
                    showMap(data.location.lat, data.location.lon, `${data.location.name}, ${data.location.country}`);
                }
            }
        } catch (error) {
            console.error("Fetch error:", error);
            if(resultDiv) resultDiv.innerHTML = `<div class="weather-card"><p class="error">Failed to fetch weather data. Check console for details.</p></div>`;
        }
    };
});
