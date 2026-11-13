
cmake_minimum_required(VERSION 3.16)

project(SmartCampusOptimizer)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find installed libraries
find_package(CURL REQUIRED)
find_package(OpenSSL REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)

# Main application
add_executable(SmartCampus
    backend/main.cpp
    backend/RoomManager.cpp
    backend/BookingManager.cpp
    backend/ResourceAllocator.cpp
    backend/api/SupabaseClient.cpp
    backend/config/Config.cpp
    backend/api/AuthManager.cpp
    backend/api/JWTVerifier.cpp
    backend/api/RoomDatabase.cpp
)
# Link external libraries
target_link_libraries(SmartCampus PRIVATE
    CURL::libcurl
    OpenSSL::SSL
    OpenSSL::Crypto
    nlohmann_json::nlohmann_json
)



add_executable(ConfigTest
    backend/config/config_test.cpp
    backend/config/Config.cpp
)




add_executable(SupabaseTest
    backend/api/supabase_test.cpp
    backend/api/SupabaseClient.cpp
    backend/config/Config.cpp
    backend/api/AuthManager.cpp
)

target_link_libraries(SupabaseTest PRIVATE
    CURL::libcurl
    OpenSSL::SSL
    OpenSSL::Crypto
    nlohmann_json::nlohmann_json
)

add_executable(AuthTest
    tests/auth_test.cpp
    backend/api/AuthManager.cpp
    backend/api/SupabaseClient.cpp
    backend/config/Config.cpp
    backend/api/JWTVerifier.cpp
)

target_link_libraries(AuthTest PRIVATE
    CURL::libcurl
    OpenSSL::SSL
    OpenSSL::Crypto
    nlohmann_json::nlohmann_json
)

add_executable(JWTTest
    tests/jwt_test.cpp
    backend/api/JWTVerifier.cpp
    backend/api/SupabaseClient.cpp
    backend/config/Config.cpp
)

target_link_libraries(JWTTest
    CURL::libcurl
    OpenSSL::SSL
    OpenSSL::Crypto
    nlohmann_json::nlohmann_json
)


# Room Database Test
add_executable(RoomDatabaseTest
    tests/room_database_test.cpp
    backend/api/RoomDatabase.cpp
    backend/api/AuthManager.cpp
    backend/api/SupabaseClient.cpp
    backend/config/Config.cpp
)

target_link_libraries(RoomDatabaseTest PRIVATE
    CURL::libcurl
    OpenSSL::SSL
    OpenSSL::Crypto
    nlohmann_json::nlohmann_json
)



# Booking Database Test
add_executable(BookingDatabaseTest
    tests/booking_database_test.cpp
    backend/api/BookingDatabase.cpp
    backend/api/AuthManager.cpp
    backend/api/SupabaseClient.cpp
    backend/config/Config.cpp
)

target_link_libraries(BookingDatabaseTest PRIVATE
    CURL::libcurl
    OpenSSL::SSL
    OpenSSL::Crypto
    nlohmann_json::nlohmann_json
)
