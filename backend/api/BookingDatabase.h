
#ifndef BOOKING_DATABASE_H
#define BOOKING_DATABASE_H

#include "SupabaseClient.h"
#include <string>
#include <nlohmann/json.hpp>

class BookingDatabase {
private:
    SupabaseClient& client;

public:
    explicit BookingDatabase(SupabaseClient& supabaseClient);

    bool addBooking(
        const nlohmann::json& bookingData,
        const std::string& accessToken
    );

    nlohmann::json getAllBookings(
        const std::string& accessToken
    );

    nlohmann::json getMyBookings(
        const std::string& userId,
        const std::string& accessToken
    );

    bool updateBookingStatus(
        const std::string& bookingId,
        const std::string& status,
        const std::string& accessToken
    );

    bool deleteBooking(
        const std::string& bookingId,
        const std::string& accessToken
    );
};

#endif
