
#ifndef CONFIG_H
#define CONFIG_H

#include <string>

class Config {
public:
    static bool load(const std::string& filePath);

    static const std::string& getSupabaseUrl();
    static const std::string& getSupabasePublishableKey();

private:
    static std::string supabaseUrl;
    static std::string supabasePublishableKey;
};

#endif
