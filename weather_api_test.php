<?php
// Weather API Backend for AJAX requests
header('Content-Type: application/json');

$apiKey = '2dff6c942afe4c91a8c50625250505'; // Your WeatherAPI.com API key

// Check if it's a search query or a weather fetch query
if (isset($_GET['query'])) {
    // Handle city search for autocomplete
    $searchQuery = urlencode($_GET['query']);
    $searchUrl = "http://api.weatherapi.com/v1/search.json?key={$apiKey}&q={$searchQuery}";
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $searchUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10, // Shorter timeout for search
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => "GET",
    ]);

    $response = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);

    if ($err) {
        echo json_encode(['error' => 'cURL Error (search): ' . $err]);
        exit;
    }
    // Directly echo the response from search API, it's already JSON
    echo $response;
    exit;

} elseif (isset($_GET['city'])) {
    // Handle weather forecast fetch
    $city = urlencode($_GET['city']);
    // Modified to fetch 3-day forecast data
    $apiUrl = "http://api.weatherapi.com/v1/forecast.json?key={$apiKey}&q={$city}&days=3&aqi=no";

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $apiUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => "GET",
    ]);

    $response = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);

    if ($err) {
        echo json_encode(['error' => 'cURL Error (forecast): ' . $err]);
        exit;
    }

    $weather_data = json_decode($response, true);
    if (isset($weather_data['error'])) {
        // Ensure we are sending a structured error
        echo json_encode(['error' => ['message' => $weather_data['error']['message']]]);
        exit;
    }
    echo json_encode($weather_data);
    exit;

} else {
    echo json_encode(['error' => ['message' => 'No city or query provided.']]);
    exit;
}
?>
