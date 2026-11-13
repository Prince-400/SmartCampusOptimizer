
#include "BookingDatabase.h"

#include <iostream>
#include <stdexcept>
#include <curl/curl.h>

using json = nlohmann::json;

BookingDatabase::BookingDatabase(SupabaseClient& supabaseClient)
    : client(supabaseClient) {
}

// Add a new booking
bool BookingDatabase::addBooking(
    const json& bookingData,
    const std::string& accessToken
) {
    SupabaseClient::Response response = client.request(
        "POST",
        "/rest/v1/bookings",
        bookingData,
        accessToken
    );

    if (!response.isSuccess()) {
        std::cerr << "Failed to add booking: "
                  << response.error << "\n"
                  << response.body << std::endl;
        return false;
    }

    std::cout << "Booking added successfully!\n";
    return true;
}

// Retrieve all bookings
json BookingDatabase::getAllBookings(
    const std::string& accessToken
) {
    SupabaseClient::Response response = client.request(
        "GET",
        "/rest/v1/bookings?select=*",
        nullptr,
        accessToken
    );

    if (!response.isSuccess()) {
        std::cerr << "Failed to retrieve bookings: "
                  << response.error << "\n"
                  << response.body << std::endl;
        return json::array();
    }

    try {
        return json::parse(response.body);
    }
    catch (const json::exception& e) {
        std::cerr << "Invalid bookings response: "
                  << e.what() << std::endl;
        return json::array();
    }
}

// Retrieve bookings belonging to one user
json BookingDatabase::getMyBookings(
    const std::string& userId,
    const std::string& accessToken
) {
    if (userId.empty()) {
        std::cerr << "User ID cannot be empty.\n";
        return json::array();
    }

    // UUID characters are safe in this query value.
    std::string endpoint =
        "/rest/v1/bookings?select=*&booked_by=eq." + userId;

    SupabaseClient::Response response = client.request(
        "GET",
        endpoint,
        nullptr,
        accessToken
    );

    if (!response.isSuccess()) {
        std::cerr << "Failed to retrieve user bookings: "
                  << response.error << "\n"
                  << response.body << std::endl;
        return json::array();
    }

    try {
        return json::parse(response.body);
    }
    catch (const json::exception& e) {
        std::cerr << "Invalid bookings response: "
                  << e.what() << std::endl;
        return json::array();
    }
}

// Update booking status
bool BookingDatabase::updateBookingStatus(
    const std::string& bookingId,
    const std::string& status,
    const std::string& accessToken
) {
    if (bookingId.empty() || status.empty()) {
        std::cerr << "Booking ID and status are required.\n";
        return false;
    }

    // Encode the booking ID before using it in a URL.
    CURL* curl = curl_easy_init();
    if (!curl) {
        std::cerr << "Failed to initialize URL encoder.\n";
        return false;
    }

    char* encoded = curl_easy_escape(
        curl,
        bookingId.c_str(),
        static_cast<int>(bookingId.size())
    );

    if (!encoded) {
        curl_easy_cleanup(curl);
        std::cerr << "Failed to encode booking ID.\n";
        return false;
    }

    std::string endpoint =
        "/rest/v1/bookings?booking_id=eq." +
        std::string(encoded);

    curl_free(encoded);
    curl_easy_cleanup(curl);

    json payload = {
        {"status", status}
    };

    SupabaseClient::Response response = client.request(
        "PATCH",
        endpoint,
        payload,
        accessToken
    );

    if (!response.isSuccess()) {
        std::cerr << "Failed to update booking: "
                  << response.error << "\n"
                  << response.body << std::endl;
        return false;
    }

    std::cout << "Booking status updated successfully!\n";
    return true;
}

// Delete a booking
bool BookingDatabase::deleteBooking(
    const std::string& bookingId,
    const std::string& accessToken
) {
    if (bookingId.empty()) {
        std::cerr << "Booking ID cannot be empty.\n";
        return false;
    }

    CURL* curl = curl_easy_init();
    if (!curl) {
        std::cerr << "Failed to initialize URL encoder.\n";
        return false;
    }

    char* encoded = curl_easy_escape(
        curl,
        bookingId.c_str(),
        static_cast<int>(bookingId.size())
    );

    if (!encoded) {
        curl_easy_cleanup(curl);
        std::cerr << "Failed to encode booking ID.\n";
        return false;
    }

    std::string endpoint =
        "/rest/v1/bookings?booking_id=eq." +
        std::string(encoded);

    curl_free(encoded);
    curl_easy_cleanup(curl);

    SupabaseClient::Response response = client.request(
        "DELETE",
        endpoint,
        nullptr,
        accessToken
    );

    if (!response.isSuccess()) {
        std::cerr << "Failed to delete booking: "
                  << response.error << "\n"
                  << response.body << std::endl;
        return false;
    }

    std::cout << "Booking deleted successfully!\n";
    return true;
}
